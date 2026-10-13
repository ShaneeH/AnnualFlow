import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { errorMessage } from '../../core/interceptors/api-error.interceptor';
import { Account, AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { FindingsExportService } from '../../core/services/findings-export.service';
import { LetterAvatar } from '../../shared/components/letter-avatar/letter-avatar';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, FormsModule, LetterAvatar],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly companies = inject(CompanyService);
  private readonly findings = inject(FindingsExportService);

  account: Account | null = null;
  loadError: string | null = null;
  actionError: string | null = null;
  exporting = false;
  confirmingDelete = false;
  deleting = false;
  confirmText = '';

  async ngOnInit(): Promise<void> {
    try {
      this.account = await this.auth.getAccount();
    } catch (error) {
      this.loadError = errorMessage(error, 'Your account could not be loaded.');
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    void this.router.navigateByUrl('/');
  }

  /** One JSON file with the profile and the findings export of every company the user owns. */
  async exportData(): Promise<void> {
    if (!this.account || this.exporting) return;
    this.exporting = true;
    this.actionError = null;
    try {
      const owned = (await firstValueFrom(this.companies.getCompanies())).filter(c => c.isOwned);
      const companies = [];
      for (const company of owned) {
        const data = await firstValueFrom(
          this.findings.load(company.companyId, company.companyName, null).pipe(catchError(() => of(null)))
        );
        companies.push(data ?? { company: { id: company.companyId, name: company.companyName }, periods: [] });
      }
      const payload = {
        generator: 'Annualflow',
        exportedAt: new Date().toISOString(),
        account: { ...this.account.user, signInProvider: 'google' },
        companies
      };
      const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `annualflow-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this.actionError = errorMessage(error, 'Your data could not be exported.');
    } finally {
      this.exporting = false;
    }
  }

  startDelete(): void {
    this.confirmingDelete = true;
    this.confirmText = '';
    this.actionError = null;
  }

  cancelDelete(): void {
    this.confirmingDelete = false;
    this.confirmText = '';
  }

  async deleteAccount(): Promise<void> {
    if (this.confirmText !== 'DELETE' || this.deleting) return;
    this.deleting = true;
    this.actionError = null;
    try {
      await this.auth.deleteAccount();
      void this.router.navigateByUrl('/');
    } catch (error) {
      this.actionError = errorMessage(error, 'The account could not be deleted.');
    } finally {
      this.deleting = false;
    }
  }
}
