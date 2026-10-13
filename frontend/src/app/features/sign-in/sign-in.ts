import { AfterViewInit, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sign-in',
  imports: [RouterLink, DatePipe],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css'
})
export class SignIn implements AfterViewInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  @ViewChild('googleButton') private googleButton?: ElementRef<HTMLElement>;

  errorMessage: string | null = null;
  recovering = false;

  /** Only same-app paths, so the query string cannot redirect off-site. */
  private get returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/documents';
    return url.startsWith('/') && !url.startsWith('//') ? url : '/documents';
  }

  ngAfterViewInit(): void {
    if (this.auth.currentUser()) {
      void this.router.navigateByUrl(this.returnUrl);
      return;
    }
    const element = this.googleButton?.nativeElement;
    if (!element) return;
    void this.auth.renderButton(
      element,
      // null = account pending deletion: stay here and show the recover prompt.
      user => user && void this.router.navigateByUrl(this.returnUrl),
      message => (this.errorMessage = message)
    );
  }

  async recover(): Promise<void> {
    this.recovering = true;
    this.errorMessage = null;
    try {
      await this.auth.recoverAccount();
      void this.router.navigateByUrl('/profile');
    } catch (error) {
      this.errorMessage = (error as Error)?.message ?? 'The account could not be recovered.';
    } finally {
      this.recovering = false;
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    void this.router.navigateByUrl('/');
  }
}
