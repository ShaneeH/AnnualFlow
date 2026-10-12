import { Routes } from '@angular/router';

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
        title: 'Report Hub | AI financial report intelligence'
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.Dashboard),
        title: 'Report Hub | Dashboard'
      },

      {
        path: 'about',
        loadComponent: () =>
          import('./features/about/about').then(m => m.About),
        title: 'Report Hub | About'
      },

      {
        path: 'documents/new',
        loadComponent: () =>
          import('./features/documents/new-document/new-document').then(m => m.NewDocument),
        title: 'Report Hub | Create New Report'
      },

      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents').then(m => m.Documents),
        title: 'Report Hub | My Reports'
      },

      {
        path: '**',
        loadComponent: () =>
          import('./layout/not-found/not-found').then(m => m.NotFound),
        title: 'Report Hub | Page Not Found'
      }
    ]
  }
];