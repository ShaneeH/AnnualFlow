import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';

interface Feature {
  icon: string;
  title: string;
  text: string;
  highlight?: boolean;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing {
  private readonly companyService = inject(CompanyService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  isOpeningDemo = false;

  /** Bars for the animated KPI preview (fictional Northwind quarters, EUR m). */
  readonly previewBars = [
    { label: 'Q1', value: 57.2 },
    { label: 'Q2', value: 60.4 },
    { label: 'Q3', value: 63.1 },
    { label: 'Q4', value: 67.9 }
  ].map(bar => ({ ...bar, height: Math.round(35 + ((bar.value - 55) / 13) * 60) }));

  readonly features: Feature[] = [
    { icon: '⚡', title: 'AI extraction', text: 'Upload a PDF and get companies, periods and figures back in a strict, validated schema.' },
    {
      icon: '🧩', title: 'Data Enrichment', highlight: true,
      text: 'A new document for an existing company and period fills the gaps in that one record, with no duplicates, and flags any figures that changed.'
    },
    { icon: '∑', title: 'Deterministic KPIs', text: 'Margins, ratios and period-over-period changes are calculated in code, not by the AI.' },
    { icon: '🤖', title: 'AI Insight', text: 'A grounded briefing on performance, external factors, improvements and risks.' },
    { icon: '📄', title: 'Board report PDF', text: 'One click builds a board-ready PDF with KPIs, charts and the insight.' },
    { icon: '🛡️', title: 'Rejects non-financial docs', text: 'CVs, invoices and brochures are refused before anything touches the database.' }
  ];

  readonly steps = [
    { title: 'Upload', text: 'Drop in an annual or interim report PDF. It is checked and fingerprinted (SHA-256).' },
    { title: 'Extract & validate', text: 'AI extracts the figures; the server validates every value before saving.' },
    { title: 'Enrich', text: 'Figures merge into the company’s existing periods in one transaction.' },
    { title: 'Explore', text: 'Dashboard, charts, AI Insight and a board report PDF.' }
  ];

  readonly stack = ['Angular 21', 'Node.js + Express 5', 'TypeScript', 'PostgreSQL', 'OpenAI Responses API', 'GitHub Actions'];

  /** "Try the demo": open the fictional demo company's dashboard. */
  openDemo(): void {
    if (this.isOpeningDemo) return;
    this.isOpeningDemo = true;

    this.companyService
      .getCompanies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: companies => {
          this.isOpeningDemo = false;
          const demo = companies.find(company => company.isDemo);

          if (demo) {
            void this.router.navigate(['/dashboard'], { queryParams: { companyId: demo.companyId } });
            return;
          }

          this.toasts.show('info', 'Demo data not loaded', 'Run `npm run db:seed:demo` on the backend to add the demo company.');
          void this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.isOpeningDemo = false;
          void this.router.navigate(['/dashboard']);
        }
      });
  }
}
