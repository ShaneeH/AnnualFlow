import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { FindingsExportService } from '../../core/services/findings-export.service';
import { Profile } from './profile';

describe('Profile', () => {
  const auth = {
    getAccount: vi.fn().mockResolvedValue({
      user: { id: 1, name: 'Shane Hahesy', email: 'shane@example.com', avatarUrl: null, createdAt: '2026-10-01T10:00:00Z' },
      deletion: { pending: false, deletedAt: null, purgeAfter: null },
      counts: { companies: 2, reports: 5 }
    }),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CompanyService, useValue: { getCompanies: () => of([]) } },
        { provide: FindingsExportService, useValue: {} }
      ]
    }).compileComponents();
  });

  it('shows the account and only deletes after DELETE is typed', async () => {
    const fixture = TestBed.createComponent(Profile);
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Shane Hahesy');
    expect(el.textContent).toContain('Signed in with Google');
    expect(el.querySelector('app-letter-avatar')!.textContent!.trim()).toBe('S');

    const component = fixture.componentInstance;
    component.startDelete();
    component.confirmText = 'delete';
    await component.deleteAccount();
    expect(auth.deleteAccount).not.toHaveBeenCalled();

    component.confirmText = 'DELETE';
    await component.deleteAccount();
    expect(auth.deleteAccount).toHaveBeenCalledTimes(1);
  });
});
