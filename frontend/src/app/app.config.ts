import {
  ApplicationConfig,
<<<<<<< HEAD
=======
  inject,
  provideAppInitializer,
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';

import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
<<<<<<< HEAD
import { provideRouter } from '@angular/router';
=======
import { credentialsInterceptor } from './core/interceptors/credentials.interceptor';
import { AuthService } from './core/services/auth.service';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideZoneChangeDetection({
      eventCoalescing: true
    }),

<<<<<<< HEAD
    provideHttpClient(withInterceptors([apiErrorInterceptor])),

    provideRouter(routes)
=======
    provideHttpClient(withInterceptors([credentialsInterceptor, apiErrorInterceptor])),

    // Load the signed-in user in the background; pages render straight away.
    provideAppInitializer(() => {
      void inject(AuthService).load();
    }),

    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }))
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
  ]
};