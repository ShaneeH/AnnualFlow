import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

/** Soft-delete state: a pending account can only be recovered within the window. */
export interface DeletionStatus {
  pending: boolean;
  deletedAt: string | null;
  purgeAfter: string | null;
}

export interface AuthState {
  user: User | null;
  deletion: DeletionStatus | null;
}

export interface Account extends AuthState {
  user: User;
  counts: { companies: number; reports: number };
}

/** Minimal typing for the Google Identity Services script. */
interface GoogleAccountsId {
  initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth`;
  private gisScript: Promise<GoogleAccountsId> | null = null;

  /** The signed-in, active user, or null (also null while the account is pending deletion). */
  readonly currentUser = signal<User | null>(null);
  /** Set when the signed-in Google account is pending deletion and can be recovered. */
  readonly pendingDeletion = signal<(DeletionStatus & { user: User }) | null>(null);
  /** False until /auth/me has answered once. */
  readonly loaded = signal(false);

  get configured(): boolean {
    return !!environment.googleClientId;
  }

  /** Called on startup. Never throws: a failure just means signed out. */
  load(): Promise<User | null> {
    return firstValueFrom(
      this.http.get<AuthState>(`${this.url}/me`).pipe(catchError(() => of({ user: null, deletion: null })))
    ).then(state => {
      this.apply(state);
      this.loaded.set(true);
      return this.currentUser();
    });
  }

  private apply(state: AuthState): void {
    if (state.user && state.deletion?.pending) {
      this.currentUser.set(null);
      this.pendingDeletion.set({ ...state.deletion, user: state.user });
    } else {
      this.currentUser.set(state.user);
      this.pendingDeletion.set(null);
    }
  }

  getAccount(): Promise<Account> {
    return firstValueFrom(this.http.get<Account>(`${this.url}/account`));
  }

  /** Soft delete with a 30-day recovery window. The server also ends the session. */
  async deleteAccount(): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.url}/account`, { body: { confirm: 'DELETE' } }));
    window.google?.accounts.id.disableAutoSelect();
    this.currentUser.set(null);
    this.pendingDeletion.set(null);
  }

  async recoverAccount(): Promise<void> {
    this.apply(await firstValueFrom(this.http.post<AuthState>(`${this.url}/account/recover`, {})));
  }

  /** Renders Google's "Sign in with Google" button. onSignedIn gets null when the account is pending deletion. */
  async renderButton(element: HTMLElement, onSignedIn: (user: User | null) => void, onError: (message: string) => void): Promise<void> {
    if (!this.configured) {
      onError('Sign-in is not configured for this deployment.');
      return;
    }
    let gis: GoogleAccountsId;
    try {
      gis = await this.loadGis();
    } catch {
      onError('Google sign-in could not be loaded. Check your connection or content blocker.');
      return;
    }
    gis.initialize({
      client_id: environment.googleClientId,
      callback: ({ credential }) => {
        this.signIn(credential).then(onSignedIn, error => onError(error?.message ?? 'Sign-in failed.'));
      }
    });
    gis.renderButton(element, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular' });
  }

  private async signIn(credential: string): Promise<User | null> {
    this.apply(await firstValueFrom(this.http.post<AuthState>(`${this.url}/google`, { credential })));
    return this.currentUser();
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.http.post(`${this.url}/logout`, {}).pipe(catchError(() => of(null))));
    window.google?.accounts.id.disableAutoSelect();
    this.currentUser.set(null);
    this.pendingDeletion.set(null);
  }

  private loadGis(): Promise<GoogleAccountsId> {
    if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
    this.gisScript ??= new Promise<GoogleAccountsId>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('GIS missing')));
      script.onerror = () => {
        this.gisScript = null;
        reject(new Error('GIS failed to load'));
      };
      document.head.appendChild(script);
    });
    return this.gisScript;
  }
}
