# mongo-cursor-pagination — repo card

> A map, not a manual. Keep it ~1 screen; point to detail, don't inline it.

## What it is

Public OSS npm package (`mongo-cursor-pagination`) implementing cursor/keyset pagination for MongoDB: paginated `find`, `aggregate`, and relevancy-ranked `search` with opaque BSON-url-encoded cursor tokens, supporting both the native `mongodb` driver and `mongoist`, plus a Mongoose plugin. Has many external consumers beyond Mixmax — API changes are semver-sensitive.

## serves

role: cursor-based (keyset) pagination for MongoDB queries — `find` / `findWithReq` / `aggregate` / `search` exports, `config` limits, and a Mongoose `paginate`/search plugin
referenced-by: [app, compose, contacts, emailapps, google-apis, microsoft, monorepo-users, odm, publications, service-dialer, service-salesforce, service-sequences, service-tasks, users]

## Code map

- Public exports -> src/index.ts
- Paginated find / aggregate -> src/find.ts, src/aggregate.ts
- Express wrapper (pagination params from req.query) -> src/findWithReq.ts
- Text-score search pagination -> src/search.ts
- Mongoose plugin (adds `paginate` / search statics) -> src/mongoose.plugin.ts
- Defaults (MAX_LIMIT, DEFAULT_LIMIT, COLLATION) -> src/config.ts
- Cursor token encode/decode + query building -> src/utils/ (bsonUrlEncoding.ts, query.ts)
- Tests (in-memory Mongo via test/support/db.ts) -> test/

## Conventions

- npm (package-lock.json), Node 18 (.nvmrc); TypeScript compiled by `tsc` to dist/node (main entry)
- Jest (ts-jest) with mongodb-memory-server; full suite runs twice — `DRIVER=mongoist` and `DRIVER=native`
- CI: GitHub Actions via the public reusable workflow (mixmaxhq/github-workflows-public checks.yml: `npm run ci` = lint + tests, plus commitlint) -> .github/workflows/ci.yml
- Conventional commits; published to public npm by semantic-release — no publish CI step, engineers run `npm run semantic-release` from master

## Run / test

- `npm ci`
- `npm test` — both drivers; or `npm run test:native` / `npm run test:mongoist`
- `npm run lint` — eslint + `tsc --noEmit`
- `npm run build` — tsc to dist/

## Load the matching domain card

- Cross-cutting library — load the consuming capability's card, not a domain-* for this repo.
