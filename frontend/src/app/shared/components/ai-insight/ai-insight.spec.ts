import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ApiError } from '../../../core/interceptors/api-error.interceptor';
import { AiInsight } from '../../../core/models/ai-insight.model';
import { InsightService } from '../../../core/services/insight.service';
import { AiInsightComponent, formatInsightText } from './ai-insight';

const insight: AiInsight = {
  companyId: 1,
  period: 'FY2025',
  model: 'gpt-test',
  generatedAt: '2026-10-12T00:00:00Z',
  content: {
    performanceSummary: 'Revenue reached 1.8bn.',
    marketFactors: ['Live events demand may have helped.'],
    economicPoliticalFactors: ['Rates could affect spending.'],
    socialFactors: ['Streaming habits may matter.'],
    improvements: ['Improve cash conversion.'],
    risks: ['Watch leverage.']
  }
};

describe('AiInsightComponent', () => {
  let fixture: ComponentFixture<AiInsightComponent>;
  let component: AiInsightComponent;
  const service = { getInsight: vi.fn(), generateInsight: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [AiInsightComponent],
      providers: [{ provide: InsightService, useValue: service }]
    }).compileComponents();

    fixture = TestBed.createComponent(AiInsightComponent);
    component = fixture.componentInstance;
    component.minThinkingMs = 0;
    fixture.componentRef.setInput('companyId', 1);
    fixture.componentRef.setInput('period', 'FY2025');
    fixture.componentRef.setInput('companyName', 'WWE');
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;

  it('renders an accessible robot button', () => {
    const button = el().querySelector('button.robot-button');
    expect(button?.getAttribute('aria-label')).toBe('AI Insight');
    expect(button?.querySelector('svg')).toBeTruthy();
  });

  it('opens the panel and shows a cached insight with all sections', () => {
    service.getInsight.mockReturnValue(of(insight));

    (el().querySelector('button.robot-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.getInsight).toHaveBeenCalledWith(1, 'FY2025');
    expect(service.generateInsight).not.toHaveBeenCalled();
    expect(el().querySelector('[role="dialog"]')).toBeTruthy();

    const titles = Array.from(el().querySelectorAll('.insight-card h3')).map(h => h.textContent?.trim());
    expect(titles.length).toBe(6);
    expect(el().textContent).toContain('Where they could improve');
    expect(el().textContent).toContain('Risks to watch');
    expect(el().textContent).toContain('AI-generated, not financial advice');
  });

  it('shows the empty state on 404 and generates on demand', () => {
    service.getInsight.mockReturnValue(throwError(() => new ApiError('Not found', 404, null)));
    service.generateInsight.mockReturnValue(of(insight));

    component.open();
    fixture.detectChanges();
    expect(component.state).toBe('empty');
    expect(service.generateInsight).not.toHaveBeenCalled();

    (el().querySelector('.empty-state button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.generateInsight).toHaveBeenCalledWith(1, 'FY2025', false);
    expect(component.state).toBe('ready');
  });

  it('shows the thinking animation while generating', () => {
    service.generateInsight.mockReturnValue(of(insight));
    component.minThinkingMs = 50;
    component.isOpen = true;

    component.generate();
    fixture.detectChanges();

    expect(component.state).toBe('thinking');
    expect(el().querySelector('.thinking')).toBeTruthy();
  });

  it('regenerates with regenerate=true', () => {
    service.getInsight.mockReturnValue(of(insight));
    service.generateInsight.mockReturnValue(of(insight));
    component.open();
    fixture.detectChanges();

    const regen = Array.from(el().querySelectorAll('button')).find(b => b.textContent?.includes('Regenerate'));
    regen!.click();

    expect(service.generateInsight).toHaveBeenCalledWith(1, 'FY2025', true);
  });

  it('shows an error state with retry', () => {
    service.getInsight.mockReturnValue(
      throwError(() => new ApiError('The AI insight service is busy.', 429, 'req-1'))
    );

    component.open();
    fixture.detectChanges();

    expect(component.state).toBe('error');
    expect(el().querySelector('.error-state')?.textContent).toContain('busy');
  });

  it('resets when the period changes', () => {
    service.getInsight.mockReturnValue(of(insight));
    component.open();
    fixture.detectChanges();
    expect(component.insight).toBe(insight);

    service.getInsight.mockReturnValue(of({ ...insight, period: 'FY2024' }));
    fixture.componentRef.setInput('period', 'FY2024');
    fixture.detectChanges();

    expect(service.getInsight).toHaveBeenLastCalledWith(1, 'FY2024');
    expect(component.insight?.period).toBe('FY2024');
  });

  it('closes with the close button', () => {
    service.getInsight.mockReturnValue(of(insight));
    component.open();
    fixture.detectChanges();

    (el().querySelector('.close-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el().querySelector('[role="dialog"]')).toBeNull();
  });

  it('formats the whole insight as plain text', () => {
    const text = formatInsightText(insight, 'WWE', 'FY 2025');

    expect(text).toContain('AI Insight: WWE (FY 2025)');
    expect(text).toContain('PERFORMANCE SUMMARY\nRevenue reached 1.8bn.');
    expect(text).toContain('WHERE THEY COULD IMPROVE\n- Improve cash conversion.');
    expect(text).toContain('RISKS TO WATCH\n- Watch leverage.');
    expect(text).toContain('AI-generated, not financial advice');
  });

  it('copies via navigator.clipboard and shows Copied! feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    service.getInsight.mockReturnValue(of(insight));
    component.open();
    fixture.detectChanges();

    await component.copy();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('AI Insight: WWE'));
    expect(el().querySelector('.copy-button')?.textContent).toContain('Copied!');
  });

  it('falls back to execCommand when the Clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const exec = vi.fn().mockReturnValue(true);
    (document as any).execCommand = exec;
    service.getInsight.mockReturnValue(of(insight));
    component.open();

    await component.copy();

    expect(exec).toHaveBeenCalledWith('copy');
    expect(component.copied).toBe(true);
  });

  it('opens immediately when initiallyOpen is set and reports open/close', () => {
    const changes: boolean[] = [];
    component.openChange.subscribe(value => changes.push(value));
    service.getInsight.mockReturnValue(of(insight));

    fixture.componentRef.setInput('initiallyOpen', true);
    component.ngOnInit();
    component.close();

    expect(changes).toEqual([true, false]);
  });
});
