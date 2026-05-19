# personal-dashboard

Personal founder ops dashboard. Not a public product.

Aggregates links, service health pings, and live server stats (CPU, RAM, disk) into a single page. Designed for quick daily checks on infrastructure, AI provider accounts, and running services.

## What it shows

- Grouped panels for personal services, AI provider portals, and developer tools
- Live ping status for each service with historical sparklines
- Server resource usage pulled from the host at runtime
- Docker container status

## Tech

- Node.js 22 / Express 5
- Vanilla JS frontend served as a single HTML file with inline SVG sparklines
- PWA manifest for home screen pinning
- Runs inside Docker via Coolify, auto-deploys on push to `main`

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

Set `PORT` env var to change the port.

## Deployment

Push to `main`. Coolify picks up the change, rebuilds the Docker image, and redeploys. No manual steps.
