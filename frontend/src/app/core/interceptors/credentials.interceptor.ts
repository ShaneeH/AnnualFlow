import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

/**
 * API calls send the session cookie (withCredentials) and an X-Requested-With
 * header, which the backend requires on writes as CSRF protection.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  return next(req.clone({ withCredentials: true, setHeaders: { 'X-Requested-With': 'Annualflow' } }));
};
