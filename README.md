# Country Search

Live country search with request cancellation. Data: https://countries.dev

Task: https://github.com/rolling-scopes-school/tasks/blob/master/fullstack-engineering/tasks/country-search/README.md

## Scripts

- `npm run build` — compile TypeScript to `dist/` (native ES modules)
- `npm test` — run Vitest
- `npm run lint` / `npm run format`

Open `index.html` through any static server after `npm run build`.

See [DESIGN.md](./DESIGN.md) for how stale requests are cancelled, why the debounce is 500 ms,
complexity and clean code notes.
