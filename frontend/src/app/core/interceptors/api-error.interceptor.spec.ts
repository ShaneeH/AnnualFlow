import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ApiError, apiErrorInterceptor, errorMessage } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  it('keeps the backend message, status, code and request ID for 5xx errors', () => {
    let caught: unknown;
    http.post('/api/reports/add', null).subscribe({ error: e => (caught = e) });

    controller.expectOne('/api/reports/add').flush(
      { success: false, error: 'The OpenAI API key was rejected.', code: 'X', requestId: 'req-1' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    expect(caught).toBeInstanceOf(ApiError);
    const error = caught as ApiError;
    expect(error.status).toBe(503);
    expect(error.code).toBe('X');
    expect(errorMessage(error, 'fallback')).toBe('The OpenAI API key was rejected. (ref: req-1)');
  });

  it('explains network failures', () => {
    let caught: unknown;
    http.get('/api/x').subscribe({ error: e => (caught = e) });
    controller.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0 });

    expect(errorMessage(caught, 'fallback')).toContain('Could not reach the server');
  });
});
