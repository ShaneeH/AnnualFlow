import { DatePipe } from '@angular/common';
import { Component, DestroyRef, HostListener, OnChanges, SimpleChanges, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, forkJoin, map, timer } from 'rxjs';

import { ApiError, errorMessage } from '../../../core/interceptors/api-error.interceptor';
import { AiInsight, AiInsightContent } from '../../../core/models/ai-insight.model';
import { InsightService } from '../../../core/services/insight.service';

export type InsightState = 'idle' | 'loading' | 'thinking' | 'ready' | 'empty' | 'error';

type ListKey = Exclude<keyof AiInsightContent, 'performanceSummary'>;

export interface InsightSection {
  key: ListKey;
  title: string;
  icon: string;
}

export const INSIGHT_SECTIONS: readonly InsightSection[] = [
  { key: 'marketFactors', title: 'Market factors', icon: '📈' },
  { key: 'economicPoliticalFactors', title: 'Economic & political factors', icon: '🏛️' },
  { key: 'socialFactors', title: 'Social factors', icon: '👥' },
  { key: 'improvements', title: 'Where they could improve', icon: '🛠️' },
  { key: 'risks', title: 'Risks to watch', icon: '⚠️' }
];

/** Robot button + slide-out panel with an AI insight for one company period. */
@Component({
  selector: 'app-ai-insight',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './ai-insight.html',
  styleUrl: './ai-insight.css'
})
export class AiInsightComponent implements OnChanges {
  private readonly insightService = inject(InsightService);
  private readonly destroyRef = inject(DestroyRef);

  readonly companyId = input.required<number>();
  readonly period = input.required<string>();
  readonly companyName = input<string>('');
  readonly periodLabel = input<string>('');

  /** Minimum time the "thinking" animation is shown (ms). Tests set 0. */
  minThinkingMs = 900;

  readonly sections = INSIGHT_SECTIONS;

  isOpen = false;
  state: InsightState = 'idle';
  insight: AiInsight | null = null;
  errorMessage: string | null = null;

  private request?: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    // A different company/period invalidates whatever is shown.
    if (changes['companyId'] || changes['period']) {
      this.request?.unsubscribe();
      this.insight = null;
      this.errorMessage = null;
      this.state = 'idle';
      if (this.isOpen) this.load();
    }
  }

  open(): void {
    this.isOpen = true;
    if (this.state === 'idle' || this.state === 'error') this.load();
  }

  close(): void {
    this.isOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.close();
  }

  /** Read the cached insight; show the empty state if none exists yet. */
  load(): void {
    this.state = 'loading';
    this.errorMessage = null;

    this.run(this.insightService.getInsight(this.companyId(), this.period()), false, error => {
      if (error instanceof ApiError && error.status === 404) {
        this.state = 'empty';
        return true;
      }
      return false;
    });
  }

  generate(regenerate = false): void {
    this.state = 'thinking';
    this.errorMessage = null;

    const request = this.insightService.generateInsight(this.companyId(), this.period(), regenerate);
    this.run(request, true);
  }

  private run(
    source: Observable<AiInsight>,
    withThinkingDelay: boolean,
    handleError?: (error: unknown) => boolean
  ): void {
    this.request?.unsubscribe();

    const delayed = withThinkingDelay && this.minThinkingMs > 0
      ? forkJoin([source, timer(this.minThinkingMs)]).pipe(map(([insight]) => insight))
      : source;

    this.request = delayed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: insight => {
        this.insight = insight;
        this.state = 'ready';
      },
      error: error => {
        if (handleError?.(error)) return;
        this.errorMessage = errorMessage(error, 'The AI insight could not be loaded.');
        this.state = 'error';
      }
    });
  }
}
