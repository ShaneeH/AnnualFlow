import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CompanyService } from '../../core/services/company.service';
import { ToastService } from '../../core/services/toast.service';
import { Landing } from './landing';

describe('Landing', () => {
  let fixture: ComponentFixture<Landing>;
  let component: Landing;
  let router: Router;
  const companyService = { getCompanies: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideRouter([]), { provide: CompanyService, useValue: companyService }]
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('shows the hero CTAs, feature grid and Data Enrichment section', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('board-ready insight');
    expect(el.querySelector('a[href="/documents/new"]')?.textContent).toContain('Create new report');
    expect(el.textContent).toContain('Try the demo');
    expect(el.querySelectorAll('.feature').length).toBe(6);
    expect(el.querySelector('#data-enrichment h2')?.textContent).toContain('How Data Enrichment works');
    expect(el.textContent).toContain('conflict flagged');
    expect(el.textContent).toContain('gap filled');
  });

  it('opens the demo company dashboard', () => {
    companyService.getCompanies.mockReturnValue(of([
      { companyId: 1, companyName: 'Real plc', isDemo: false },
      { companyId: 7, companyName: 'Northwind Analytics plc', isDemo: true }
    ]));

    component.openDemo();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { queryParams: { companyId: 7 } });
  });

  it('falls back to the dashboard with a hint when no demo data is seeded', () => {
    const toasts = TestBed.inject(ToastService);
    companyService.getCompanies.mockReturnValue(of([{ companyId: 1, companyName: 'Real plc' }]));

    component.openDemo();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(toasts.toasts()[0].title).toBe('Demo data not loaded');
  });

  it('still navigates if the companies request fails', () => {
    companyService.getCompanies.mockReturnValue(throwError(() => new Error('down')));
    component.openDemo();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.isOpeningDemo).toBe(false);
  });
});
