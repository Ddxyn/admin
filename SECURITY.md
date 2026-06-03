# Security Policy

## Supported Version

Security fixes are handled on the `main` branch.

## Reporting a Vulnerability

Open a private report or contact the maintainer directly. Do not publish working exploit details before a fix is available.

## Required Production Settings

- Set `JWT_SECRET` to a random value with at least 32 characters.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Do not commit `.env.local` or database credentials.
- Run `npm run lint`, `npm run build`, and `npm audit --omit=dev --audit-level=high` before deployment.
