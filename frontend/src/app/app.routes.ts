import { Routes } from '@angular/router';

import { signInGuard } from './core/guards/sign-in.guard';

export const routes: Routes = [
  {
    path: '',
    // AppShell is the only thing loaded eagerly
    loadComponent: () =>
      import('./layout/app-shell/app-shell').then(m => m.AppShell),

    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/landing/landing').then(m => m.Landing),
        title: 'Annualflow | AI financial report intelligence'
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.Dashboard),
        title: 'Annualflow | Dashboard'
      },

      {
        path: 'about',
        loadComponent: () =>
          import('./features/about/about').then(m => m.About),
        title: 'Annualflow | About'
      },

      {
        path: 'documents/new',
        canActivate: [signInGuard],
        loadComponent: () =>
          import('./features/documents/new-document/new-document').then(m => m.NewDocument),
        title: 'Annualflow | Create New Report'
      },

      {
        path: 'profile',
        canActivate: [signInGuard],
        loadComponent: () =>
          import('./features/profile/profile').then(m => m.Profile),
        title: 'Annualflow | Profile'
      },

      {
        path: 'privacy',
        loadComponent: () =>
          import('./features/privacy/privacy').then(m => m.Privacy),
        title: 'Annualflow | Privacy'
      },

      {
        path: 'sign-in',
        loadComponent: () =>
          import('./features/sign-in/sign-in').then(m => m.SignIn),
        title: 'Annualflow | Sign in'
      },

      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents').then(m => m.Documents),
        title: 'Annualflow | My Reports'
      },

      {
        path: '**',
        loadComponent: () =>
          import('./layout/not-found/not-found').then(m => m.NotFound),
        title: 'Annualflow | Page Not Found'
      }
    ]
  }
];