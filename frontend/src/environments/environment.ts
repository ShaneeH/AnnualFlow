<<<<<<< HEAD
// Production build (default `ng build`): points at the hosted backend.
export const environment = {
  production: true,
  apiUrl: 'https://senus-board-reporting.vercel.app/api'
=======
// Production build (default `ng build`). The API is reached on the same origin:
// vercel.json rewrites /api/* to the backend deployment, so the session cookie is first-party.
export const environment = {
  production: true,
  apiUrl: '/api',
  // OAuth client ID (Web application) from Google Cloud Console. Public; not a secret.
  googleClientId: '843474200028-itj10p9sbupjjd00v8haf9cgo6kmkn96.apps.googleusercontent.com'
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
};
