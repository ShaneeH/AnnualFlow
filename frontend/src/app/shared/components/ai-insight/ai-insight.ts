import { MascotComponent } from '../mascot/mascot';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, HostListener, OnChanges, OnDestroy, OnInit, SimpleChanges, inject, input, output } from '@angular/core';
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

export const INSIGHT_DISCLAIMER =
  'AI-generated, not financial advice. External factors are plausible influences, not confirmed causes.';

/** Formats an insight as readable plain text for the clipboard. */
export function formatInsightText(
  insight: AiInsight,
  companyName: string,
  periodLabel: string
): string {
  const lines: string[] = [
    `Insights: ${companyName || 'Company'}${periodLabel ? ` (${periodLabel})` : ''}`,
    '',
    'PERFORMANCE SUMMARY',
    insight.content.performanceSummary
  ];

  for (const section of INSIGHT_SECTIONS) {
    const points = insight.content[section.key];
    if (!points.length) continue;

    lines.push('', section.title.toUpperCase(), ...points.map(point => `- ${point}`));
  }

  lines.push('', `Generated ${insight.generatedAt} (${insight.model})`, INSIGHT_DISCLAIMER);

  return lines.join('\n');
}

/** Copies text using the async Clipboard API, falling back to execCommand. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy approach (e.g. insecure context).
  }

  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

/** 'Get insights' button (with Ledger) + slide-out panel with the insights for one company period. */
@Component({
  selector: 'app-ai-insight',
  standalone: true,
  imports: [DatePipe, MascotComponent],
  templateUrl: './ai-insight.html',
  styleUrl: './ai-insight.css'
})
export class AiInsightComponent implements OnInit, OnChanges, OnDestroy {
  private readonly insightService = inject(InsightService);
  private readonly destroyRef = inject(DestroyRef);

  readonly companyId = input.required<number>();
  readonly period = input.required<string>();
  readonly companyName = input<string>('');
  readonly periodLabel = input<string>('');
  /** Open the panel immediately (used to restore dashboard state). */
  readonly initiallyOpen = input<boolean>(false);
  /** Emits whenever the panel opens or closes. */
  readonly openChange = output<boolean>();

  readonly disclaimer = INSIGHT_DISCLAIMER;
  copied = false;
  copyFailed = false;
  private copiedTimer?: ReturnType<typeof setTimeout>;

  /** Minimum time the "thinking" animation is shown (ms). Tests set 0. */
  minThinkingMs = 900;

  readonly sections = INSIGHT_SECTIONS;

  isOpen = false;
  state: InsightState = 'idle';
  insight: AiInsight | null = null;
  errorMessage: string | null = null;

  private request?: Subscription;

  ngOnInit(): void {
    if (this.initiallyOpen()) this.open();
  }

  ngOnDestroy(): void {
    clearTimeout(this.copiedTimer);
  }

  async copy(): Promise<void> {
    if (!this.insight) return;

    const ok = await copyText(formatInsightText(this.insight, this.companyName(), this.periodLabel()));
    this.copied = ok;
    this.copyFailed = !ok;

    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => {
      this.copied = false;
      this.copyFailed = false;
    }, 2000);
  }

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
    if (!this.isOpen) this.openChange.emit(true);
    this.isOpen = true;
    if (this.state === 'idle' || this.state === 'error') this.load();
  }

  close(): void {
    if (this.isOpen) this.openChange.emit(false);
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
        this.errorMessage = errorMessage(error, 'The insights could not be loaded.');
        this.state = 'error';
      }
    });
  }
}
