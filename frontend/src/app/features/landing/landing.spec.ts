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

  it('shows the intro, actions, GitHub link, feature list and Data Enrichment section', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Annualflow');
    expect(el.querySelector('.lead')?.textContent).toContain('An open source project by Shane Hahesy');
    expect(el.querySelector('a[href="/documents/new"]')?.textContent).toContain('Create new report');
    expect(el.textContent).toContain('Explore the example dataset');
    expect(el.querySelector('a[href="https://github.com/ShaneeH/senus-board-reporting"]')).toBeTruthy();
    expect(el.querySelectorAll('.feature').length).toBe(6);
    expect(el.querySelectorAll('.feature .feature-icon svg').length).toBe(6);
    expect(el.querySelector('.feature-highlight')).toBeNull();
    expect(el.textContent).not.toContain('portfolio');
    expect(el.querySelectorAll('.preview-kpi').length).toBe(3);
    expect(el.querySelector('.preview-kpi strong')?.textContent).toBe('€248.6m');
    expect(el.querySelectorAll('.preview-bar').length).toBe(4);
    expect(el.textContent).not.toContain('periods validated');
    expect(el.querySelector('#data-enrichment h2')?.textContent).toContain('How Data Enrichment works');
    expect(el.textContent).toContain('conflict flagged');
    expect(el.textContent).toContain('gap filled');
  });

  it('opens the example dataset company dashboard', () => {
    companyService.getCompanies.mockReturnValue(of([
      { companyId: 1, companyName: 'Real plc', isExample: false },
      { companyId: 7, companyName: 'Northwind Analytics plc', isExample: true }
    ]));

    component.openExample();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { queryParams: { companyId: 7 } });
  });

  it('falls back to the dashboard with a hint when no example dataset is seeded', () => {
    const toasts = TestBed.inject(ToastService);
    companyService.getCompanies.mockReturnValue(of([{ companyId: 1, companyName: 'Real plc' }]));

    component.openExample();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(toasts.toasts()[0].title).toBe('Example dataset not loaded');
  });

  it('still navigates if the companies request fails', () => {
    companyService.getCompanies.mockReturnValue(throwError(() => new Error('down')));
    component.openExample();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.isOpeningExample).toBe(false);
  });
});
