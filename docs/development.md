# Developing quirq home base

## Toolchain and commands

Use Node.js 24 and pnpm 10.23.0. Install with `pnpm install --frozen-lockfile`; do not generate an npm lockfile.

| Command                           | Purpose                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm start`                      | Develop at `http://localhost:8001`, bound to `127.0.0.1`.                               |
| `pnpm apps:sync`                  | Refresh public GitHub metadata and visible app READMEs.                                 |
| `pnpm apps:check`                 | Validate the committed catalog and hidden README removal, offline.                      |
| `pnpm apps:prune`                 | Remove hidden README text without fetching GitHub.                                      |
| `pnpm projects:sync`              | Refresh project evidence and phase counts using public data.                            |
| `pnpm projects:check`             | Validate project groups and the saved snapshot, offline.                                |
| `pnpm source:check`               | Check active source reachability, local imports, and direct dependencies.               |
| `pnpm test`                       | Run quirq catalog, phases, routes, docs, link, role, and frame-policy regression tests. |
| `pnpm apps:test`                  | Run catalog tests only.                                                                 |
| `pnpm test:app-routes`            | Run generated-route tests only.                                                         |
| `pnpm build`                      | Run prebuild checks and generate the production site in `public/`.                      |
| `pnpm serve -H 127.0.0.1 -p 9000` | Preview a production build.                                                             |
| `pnpm clean`                      | Remove generated Gatsby cache and output.                                               |

The quirq checks use saved snapshots; they need no GitHub token. Sync commands are explicit network operations. Review generated data before committing it, and restart Gatsby after changing catalog routes. Do not hand-edit `src/data/quirq-repositories.json` or `src/data/quirq-projects.json`.

## Review a change

Run the checks in the README, and format only the files you changed with `pnpm exec prettier --write <files>`. Read shared components' READMEs before changing them. Add a README for a new shared component.

For UI changes, check Home, Projects, a repository page, launch fallback, search, and Appearance. Use light and dark themes and wide and narrow app windows. Check the browser console. For window changes, open a second app, expand and restore it, minimize and reopen it, then close it. Windows share the available desktop space through a flex layout.

Keep links within the site relative. When changing a public route, consider a redirect in `vercel.json` and verify both addresses. A new custom template receives `pageContext.app`; arbitrary pages under `src/pages/` are subject to the route allowlist.

## Environment variables

| Variable                                       | Purpose                                                                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`                                 | Optional authentication for `pnpm apps:sync` to increase public API limits. Never commit it or expose it in a browser-prefixed variable. |
| `GATSBY_SITE_URL`                              | Public canonical site URL.                                                                                                               |
| `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` | Vercel-provided hostname fallback when no canonical URL is set.                                                                          |
| `GATSBY_CPU_COUNT`                             | Limit Gatsby workers on machines with limited memory.                                                                                    |
| `NODE_OPTIONS`                                 | Node runtime options, such as a larger build heap.                                                                                       |

Gatsby loads `.env.development.local` and `.env.development` for development, or `.env.production.local` and `.env.production` for a production build. The standalone sync scripts read their process environment; they do not load those files. Normal builds need no environment file.

## Deploy on Vercel

1. Import `quirq-ai/website`, using the repository root.
2. Select Node.js 24 and the pinned pnpm version; install with `pnpm install --frozen-lockfile`.
3. Keep [`vercel.json`](../vercel.json): Gatsby, `pnpm build`, and output directory `public`.
4. Optionally set `GATSBY_SITE_URL` to the production domain, then deploy.
5. Check Home, a direct repository URL, `/apps/*`, and `/launch/*` in the hydrated site.

Builds use the committed snapshots. Browser reads update repository listings and documentation between deployments; server-rendered HTML updates after syncing, committing, and deploying. This website does not deploy the linked apps.

The site's only API route is [`/api/frame-check`](../src/api/frame-check.ts). It reads public HTTPS response status and headers to decide whether a launch destination permits framing. The [mapping guide](quirq-app-mapping.md) explains its constraints and external fallback. Hosting without Gatsby serverless functions may be unable to run this check.

## quirq infra

[`infra/repo.toml`](../infra/repo.toml) declares the site's qq target and Node pin. Change the manifest through `qqsync` from [quirq-ai/sync](https://github.com/quirq-ai/sync). Use the pnpm commands for local development.

The `qq-website-*` presubmit and postsubmit workflows are generated in [quirq-ai/infra-config](https://github.com/quirq-ai/infra-config). Edit them there, never in this repository. They run a frozen install, production build, and tests; the build's prebuild hook runs the catalog, project, and source checks.

Landing rules are managed by [quirq-ai/gate](https://github.com/quirq-ai/gate). Follow the current rules shown by GitHub. Pull request approval is a human action.

## Troubleshooting

| Symptom                    | What to check                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wrong Node or pnpm version | Compare `node --version` and `pnpm --version` with the committed pins.                                                                                        |
| Missing or stale app       | Reload, check visibility in `quirq.apps.json`, and check anonymous GitHub API availability. Refresh the committed snapshots for built HTML.                   |
| New route absent locally   | Stop Gatsby, run `pnpm clean`, and restart `pnpm start`.                                                                                                      |
| Sync rate limit            | Set `GITHUB_TOKEN` in the sync process environment. Failed syncs preserve the previous snapshot.                                                              |
| Launch window says Oops    | The destination refuses framing, is unsupported, or could not be reached. Use Open in new tab; a mapping cannot override the destination's headers.           |
| Build runs out of memory   | Try `GATSBY_CPU_COUNT=2`; with enough RAM, use `NODE_OPTIONS=--max-old-space-size=8192`.                                                                      |
| Source check fails         | Follow the reported import chain or unused entry. Register actual framework entrypoints deliberately; remove unused code rather than adding broad exclusions. |

The source check also inspects Gatsby's generated `.cache` modules when present. If a dependency failure points to generated code left by a different branch or dependency set, run `pnpm clean`, then rerun the check and build. Current framework templates are always checked, even without a cache.
