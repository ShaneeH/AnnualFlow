import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { MascotComponent } from '../../shared/components/mascot/mascot';
import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { formatMoney, formatPercent, formatPerShare } from '../../shared/utils/number-format';

interface Feature {
  title: string;
  text: string;
  // Monochrome 24x24 line icon: SVG path data, stroked in currentColor.
  icon: string[];
}

const ICONS = {
  document: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h4'],
  merge: ['M6 3v6a6 6 0 0 0 6 6h6', 'M15 12l3 3-3 3', 'M6 21v-6'],
  calculator: ['M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M8 7h8', 'M8 12h.01', 'M12 12h.01', 'M16 12h.01', 'M8 16h.01', 'M12 16h.01', 'M16 16h.01'],
  spark: ['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'M6.3 6.3l2.5 2.5', 'M15.2 15.2l2.5 2.5', 'M6.3 17.7l2.5-2.5', 'M15.2 8.8l2.5-2.5'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
  shield: ['M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z', 'M9 12l2 2 4-4']
};

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MascotComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing {
  private readonly companyService = inject(CompanyService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  isOpeningExample = false;

  /** Static dashboard preview (fictional Northwind Analytics plc, FY2025 quarters). */
  readonly previewKpis = [
    { label: 'Revenue', value: formatMoney(248_600_000), change: '+18.0%' },
    { label: 'Net margin', value: formatPercent(14.14), change: '+2.5 pts' },
    { label: 'EPS', value: formatPerShare(0.88), change: '+44.3%' }
  ];

  readonly previewBars = [
    { label: 'Q1', value: 57_200_000 },
    { label: 'Q2', value: 60_400_000 },
    { label: 'Q3', value: 63_100_000 },
    { label: 'Q4', value: 67_900_000 }
  ].map(bar => ({ ...bar, display: formatMoney(bar.value), // Axis starts at €50m so the quarter-on-quarter growth is visible.
    height: Math.round(25 + ((bar.value - 50_000_000) / 20_000_000) * 75)
  }));

  readonly features: Feature[] = [
    { icon: ICONS.document, title: 'PDF extraction', text: 'Reads an annual or interim report and pulls out companies, periods and key figures into a fixed schema.' },
    { icon: ICONS.merge, title: 'Data Enrichment', text: 'A later document for the same company and period is merged into the existing record rather than stored twice.' },
    { icon: ICONS.calculator, title: 'Calculated KPIs', text: 'Margins, ratios and period-over-period changes are computed in code, not by the model.' },
    { icon: ICONS.spark, title: 'Insights', text: 'An optional written summary based only on the stored figures.' },
    { icon: ICONS.download, title: 'Board report PDF', text: 'Exports the KPIs, charts and summary for a period as a PDF.' },
    { icon: ICONS.shield, title: 'Document checks', text: 'Files that are not financial reports (a CV, for example) are rejected before anything is saved.' }
  ];

  readonly steps = [
    'Upload a PDF. It is checked and fingerprinted (SHA-256) to catch duplicates.',
    'The figures are extracted and validated on the server.',
    'They are saved, or merged into an existing period, in one transaction.',
    'View them on the dashboard, compare periods and export a report.'
  ];


  readonly repoUrl = 'https://github.com/ShaneeH/senus-board-reporting';

  /** "Explore the example dataset": open the fictional example company's dashboard. */
  openExample(): void {
    if (this.isOpeningExample) return;
    this.isOpeningExample = true;

    this.companyService
      .getCompanies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: companies => {
          this.isOpeningExample = false;
          const example = companies.find(company => company.isExample);

          if (example) {
            void this.router.navigate(['/dashboard'], { queryParams: { companyId: example.companyId } });
            return;
          }

          this.toasts.show('info', 'Example dataset not loaded', 'Run `npm run db:seed:example` on the backend to load it.');
          void this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.isOpeningExample = false;
          void this.router.navigate(['/dashboard']);
        }
      });
  }
}
