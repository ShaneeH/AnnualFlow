<p align="center">
  <img src="https://i.postimg.cc/MGycZgWh/icon.png" alt="Ledger, the Annualflow mascot" width="180">
</p>

# Annualflow

**Live site:** https://annualflow.com

Annualflow takes messy financial report PDFs and turns them into clean figures, lined up by company and period. It is for anyone with a folder of annual or interim reports who wants the numbers in one place, to compare them over time and to take them away as a tidy PDF, Excel or JSON file.

## About this project

I enjoy creating full stack applications, and I made Annualflow as a way to contribute to open source. I also enjoy working with financial tech, so this felt like a natural project to build. I have been developing it since July 2026, and the architecture, design and most of the code are my own work. Along the way it picked up a mascot, Ledger, who you'll spot around the site.

## Features

- Upload a financial report PDF and get the key figures pulled out and checked.
- Documents that aren't financial reports (a CV, an invoice) are politely turned away, and nothing is saved.
- A dashboard with the main figures, margins and charts, with a simple annual / quarterly switch.
- Compare one period with another to see what changed.
- Insights, with Ledger: a short written summary of performance, outside factors and risks, based only on the stored figures.
- Upload a second document for the same period and the figures are merged into the existing record rather than duplicated.
- Download a board report as PDF, or the figures as Excel or JSON.
- Sign in with Google to keep your own reports private. From your profile you can export all your data or delete your account (with 30 days to change your mind).

<p align="center">
  <img src="https://i.postimg.cc/h4bHWfsr/new.png" alt="Annualflow dashboard and charts" width="720">
</p>

There is also a fictional example company, Northwind Analytics plc, so you can look around without uploading anything.

## Roadmap

- Review extracted figures before they are saved
- Link each figure back to the page it came from
- Ask questions about a stored report
- Flag unusual swings between periods

---

## Under the hood

### Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | Angular 21, Chart.js, jsPDF, exceljs, Vitest |
| Backend | Node.js 22, Express 5, TypeScript, google-auth-library, `node:test` |
| AI | OpenAI Responses API with strict JSON-schema output |
| Database | PostgreSQL (`pg`), numbered SQL migrations |
| Hosting | Vercel, Postgres on Neon or similar |

An upload is checked (type, size, SHA-256 duplicate check), queued as a job and analysed by a worker. The frontend polls the job and shows a toast when it finishes.

### Key engineering decisions

- **The AI only extracts.** Margins, ratios and changes are calculated in TypeScript on the server, so they are reproducible and testable.
- **AI output is treated as untrusted.** It must match a strict schema and is validated again on the server. Anything that fails returns `422` before a database write.
- **Merge, not insert.** A second document for the same company and period fills gaps; empty values never overwrite stored ones, and differences are reported back as conflicts.
- **One transaction per upload,** so a failure leaves nothing half-saved. Re-running migrations and the example seed is safe.
- **Rate limiting** on uploads and insight generation, and clear error messages for OpenAI, database and validation failures.
- **Sync or async jobs.** `JOB_MODE=async` uses an in-process worker on long-running hosts; `JOB_MODE=sync` is the default on Vercel, where functions are frozen after responding.

### Local setup (Linux)

Prerequisites: Node 22+ (see `.nvmrc`), PostgreSQL 14+, an OpenAI API key.

```bash
git clone https://github.com/ShaneeH/senus-board-reporting.git
cd senus-board-reporting

# Database
sudo -u postgres createuser --pwprompt annualflow
sudo -u postgres createdb -O annualflow annualflow

# Backend
cd backend
cp .env.example .env
#   DATABASE_URL=postgres://annualflow:<password>@localhost:5432/annualflow
#   OPENAI_API_KEY=sk-...
#   OPENAI_MODEL=<a model that supports PDF input + structured output>
#   JOB_MODE=async   # optional; async is the default outside Vercel
#   GOOGLE_CLIENT_ID=<OAuth Web client ID>.apps.googleusercontent.com
#   JWT_SECRET=<openssl rand -hex 32>
npm ci
npm run db:migrate
npm run db:seed:example   # optional: fictional Northwind Analytics plc example dataset
npm run dev               # http://localhost:3000

# Frontend (new terminal)
cd ../frontend
npm ci
npx ng serve              # http://localhost:4200, uses the development environment -> localhost:3000
```

**Sign in with Google:** in Google Cloud Console create an OAuth client ID of type **Web application** and add
`http://localhost:4200` (and in production `https://annualflow.com`, `https://www.annualflow.com` and
`https://senus-frontend.vercel.app`) as authorised JavaScript origins. Put the client ID in `GOOGLE_CLIENT_ID`
(backend `.env`) and `googleClientId` (`frontend/src/environments/*.ts`). Uploads, deletes and insight generation need
a sign-in; the example dataset is public and read-only.

### Testing

```bash
cd backend && npm test                      # build + node:test (services, validators, routes, worker, OpenAI fakes)
cd backend && OWNERSHIP_TEST_DATABASE_URL=<throwaway db> npm run test:ownership   # two users against real Postgres
cd frontend && npx ng test --watch=false    # Vitest unit tests for components and services
```

### Deployment notes

- **Frontend:** Vercel (`frontend/`, Angular preset). The production `apiUrl` is `/api`, and `frontend/vercel.json`
  rewrites `https://annualflow.com/api/*` to the backend, so the session cookie is first-party.
- **Backend:** Vercel with `JOB_MODE=sync`, or a long-running host (Render, Railway, Fly.io, a VM) with `JOB_MODE=async`.
  Set `COOKIE_SAMESITE=lax` (thanks to the rewrite) and
  `CORS_ORIGINS=https://annualflow.com,https://www.annualflow.com,https://senus-frontend.vercel.app`. Without the rewrite
  the cookie must be `SameSite=None; Secure`, which browsers that block third-party cookies refuse.
- **Database:** any Postgres (e.g. Neon). Run `npm run db:migrate` against it.

---

*Northwind Analytics plc is a fictional company. Its figures are made up for illustration only.*

## Contributing

Bug reports, suggestions and feedback of any size are very welcome:

- Open an issue on [GitHub Issues](https://github.com/ShaneeH/senus-board-reporting/issues).
- Or send a pull request. See **Local setup** and **Testing** above, and make sure both test suites pass.
- Or get in touch: [s.hahesy@outlook.com](mailto:s.hahesy@outlook.com) · [LinkedIn](https://linkedin.com/in/shane-hahesy) · [GitHub](https://github.com/ShaneeH)

## Licence

Annualflow is released under the [MIT License](LICENSE). Copyright (c) 2026 Shane Hahesy.

---

Thanks for reading, and for stopping by. If you try Annualflow out, find a bug or have an idea, I would love to hear about it.

Shane