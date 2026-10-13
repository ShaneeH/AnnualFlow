import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Upload/create pages: signed-out visitors are sent to /sign-in and brought back afterwards. */
export const signInGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const user = auth.loaded() ? auth.currentUser() : await auth.load();
  return user ? true : inject(Router).createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};
