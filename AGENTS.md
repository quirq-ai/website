# Working on quirq Home base

This repository is quirq's Gatsby 4 / React website, adapted from the PostHog desktop interface. Public repositories in the configured GitHub organization become app pages inside a shared desktop. Read [README.md](README.md) and the [app mapping guide](docs/quirq-app-mapping.md) before changing the catalog or routes.

## Preserve the character

- Keep the wallpapers, glass icons, themes, screensavers, window chrome, and individual app identity.
- Each app can have its own URL, icon, color, presentation, custom component, and launch destination. Do not flatten everything into a uniform directory page.
- The existing window system uses a flex layout with expand, restore, minimize, and close controls. Window dimensions adapt to the available space; this is not an operating system with freely draggable windows.
- Reuse Explorer, shared controls, and project color tokens. Prefer container queries so layouts respond to their app window, not just the browser width.
- Read the component's README before using it. Add a README for a new shared component.

## Active architecture

| Area | Source |
| --- | --- |
| Organization and app presentation choices | `quirq.apps.json` |
| Generated public metadata and README snapshot | `src/data/quirq-repositories.json` |
| Catalog validation and normalization | `scripts/lib/quirq-catalog.mjs` |
| Explicit GitHub refresh command | `scripts/sync-quirq-apps.mjs` |
| Shared browser and build catalog | `src/lib/quirqApps.ts` |
| Generated routes and legacy-page exclusion | `gatsby-node.ts`, `gatsby-config.js` |
| Project groups, descriptions and phase overrides | `quirq.projects.json`, phase rules in `scripts/lib/quirq-phases.mjs` |
| Generated project phase snapshot (`pnpm projects:sync`) | `src/data/quirq-projects.json` |
| Projects view and quirq infra v0 app | `src/components/QuirqProjects/`, `src/components/QuirqInfraV0/` |
| Home window (`/`) | `src/components/HomeBase/` |
| Dock navigation bar (Home, Projects, search, open windows) and the Blobatar avatar | `src/components/Dock/`, `src/components/QuirqAvatar/`, `src/lib/quirqAvatar.ts`, `src/vendor/blobatar/` |
| Default app views | `src/components/QuirqApp/`, `src/templates/quirq-app.tsx` |
| Desktop icons and local search (the dock replaced the top bar in `src/components/TaskBarMenu/`, which is no longer mounted) | `src/components/Desktop/`, `src/components/QuirqSearch/` |
| Window state and controls | `src/context/App.tsx`, `src/components/AppWindow/` |

`src/pages/index.tsx`, `src/pages/display-options.tsx`, `src/pages/projects.tsx`, and `src/pages/404.js` are the active filesystem pages. App routes come from the catalog. Inherited PostHog pages, components, and build helpers remain in `src/` and `scripts/` for reference and asset reuse, but are excluded from this site's active page generation. `static/` holds only files the active site loads: the quirq brand art, `scripts/theme-init.js`, and three inherited PostHog images (`images/search.svg` and the two `questlog-*-sprite.png` files). Gatsby publishes everything in `static/`, so add only files a page uses. PostHog's `contents/` docs, its published brand files and its other unused `static/` art were removed (they remain in git history). Do not re-enable the old CMS, customer, analytics, billing, or notification integrations as a side effect of a change.

## Catalog changes

- Keep app mapping in `quirq.apps.json`; avoid separate hard-coded app lists in menus, search, or the homepage.
- Keep project groups and phase overrides in `quirq.projects.json`; refresh phases with `pnpm projects:sync`. A hand-set `phase` needs a `phaseReason`.
- Live state on `/v0` and `/projects` is read in the browser from public files on raw.githubusercontent.com. Do not add a token or backend for it.
- Refresh the generated snapshot with `pnpm apps:sync`. Do not hand-edit repository data or invent a deployment URL.
- After hiding a repository, run `pnpm apps:sync` (or the offline `pnpm apps:prune`) so its README text leaves the bundled snapshot; `pnpm apps:check` fails until then.
- Only public repositories belong in the snapshot. Never commit tokens or private repository metadata.
- A repository page displays metadata and a README. Opening it does not install or run the repository's code.
- Embedding requires an explicit per-app setting and a destination that permits framing. Preserve the external launch fallback.
- Custom app templates belong under `src/templates/` and receive `pageContext.app`. Keep direct URLs and window behavior working.
- Restart Gatsby after route changes. Rebuild and deploy to publish a refreshed snapshot; production does not poll GitHub automatically.

## Development and checks

Use Node.js 24 and the version of pnpm pinned in `package.json` (10.23.0). Use pnpm for project commands.

```sh
pnpm install --frozen-lockfile
pnpm start
```

The development site is at `http://localhost:8001`. Before handing off a relevant change:

```sh
pnpm apps:check
pnpm projects:check
pnpm test
pnpm build
```

Format only the files you changed with `pnpm exec prettier --write <files>`. Avoid a repository-wide formatting pass over inherited content. For UI changes, check the affected routes in light and dark themes, wide and narrow windows, and verify the console. Capture screenshots when they help review the change. For window behavior, check opening a second app, expansion, restoration, and closing.

The quirq infra workflows (`.github/workflows/qq-website-*.yml`, generated in quirq-ai/infra-config; never edit them here) run the catalog check, tests, and production build. It needs no project secrets, does not refresh GitHub data, and does not deploy or write to the repository.

## Scope and collaboration

- Read existing code and local changes before editing. Keep diffs focused and preserve work from other contributors.
- Make authorized fixes directly; the upstream PostHog issue-first and approval processes do not govern this repository.
- Treat window management and Gatsby routing as shared infrastructure. Explain and verify behavior changes there.
- Keep internal links relative. When changing an existing public URL, consider a redirect in `vercel.json` and check both URLs.
- Describe the user-visible result, relevant validation, and any remaining limitations in pull requests.
- Preserve license and attribution notices for inherited code and assets.

The inherited [apps](agents/apps.md), [components](agents/components.md), [styling](agents/styling.md), and [window system](agents/windows.md) guides can help explain shared code. They are historical reference: their PostHog data sources, integration steps, and contributor approval requirements do not override this file or the active quirq implementation.
