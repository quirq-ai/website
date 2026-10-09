# Working on quirq Home base

This repository is quirq's Gatsby 4 / React website, adapted from the PostHog desktop interface. Public repositories in the configured GitHub organization become app pages inside a shared desktop. Read [README.md](README.md) and the [app mapping guide](docs/quirq-app-mapping.md) before changing the catalog or routes.

## Preserve the character

- Keep the plain desktop background with the organization's GitHub README written on it, the glass icons, themes, screensavers, window chrome, and individual app identity.
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
| Live catalog (repository list read in the browser) and the `/apps/*` page for repositories created after the build | `src/lib/quirqLiveApps.ts`, `src/templates/quirq-live-app.tsx`, the rewrite in `vercel.json` |
| Generated routes and legacy-page exclusion | `gatsby-node.ts`, `gatsby-config.js` |
| Project groups, descriptions and phase overrides | `quirq.projects.json`, phase rules in `scripts/lib/quirq-phases.mjs` |
| Generated project phase snapshot (`pnpm projects:sync`) | `src/data/quirq-projects.json` |
| Projects view and quirq infra v0 app | `src/components/QuirqProjects/`, `src/components/QuirqInfraV0/` |
| Desktop background: plain, with the organization's GitHub profile README (read live) | `src/components/Desktop/Background.tsx`, `src/components/QuirqProfile/` |
| Home window (`/`) | `src/components/HomeBase/` |
| Dock navigation bar (Home, Projects, quirqy, search, open windows), and the Blobatar avatar with its quirqy window | `src/components/Dock/`, `src/components/QuirqAvatar/`, `src/components/Quirqy/`, `src/lib/quirqAvatar.ts`, `src/vendor/blobatar/` |
| Default app views | `src/components/QuirqApp/`, `src/templates/quirq-app.tsx` |
| Docs in app windows: the repository's Markdown files in a file tree, formatted like GitHub | `src/components/QuirqApp/DocsBrowser.tsx`, `DocsTree.tsx`, `MarkdownDoc.tsx`, `src/lib/quirqDocs.ts`, vendored `src/vendor/pierre-trees/` |
| Desktop icons (only apps with a website: `isDesktopApp` in `scripts/lib/quirq-catalog.mjs`; every app stays in Home base, search and the menus) and local search (the dock replaced the top bar in `src/components/TaskBarMenu/`, which is no longer mounted) | `src/components/Desktop/`, `src/components/QuirqSearch/` |
| Window state and controls | `src/context/App.tsx`, `src/components/AppWindow/` |
| Web pages in windows: every link to another site, the frame check, and Oops with Open in new tab | `src/templates/quirq-launch.tsx` (`/launch/*`), `src/lib/externalLinks.ts` (the click listener in `gatsby-browser.tsx`), `src/lib/frameCheck.ts`, `src/api/frame-check.ts` |

`src/pages/index.tsx`, `src/pages/display-options.tsx`, `src/pages/projects.tsx`, and `src/pages/404.js` are the active filesystem pages. App routes come from the catalog. Inherited PostHog pages, components, and build helpers remain in `src/` and `scripts/` for reference and asset reuse, but are excluded from this site's active page generation. `static/` holds only files the active site loads: the quirq brand art, `scripts/theme-init.js`, and three inherited PostHog images (`images/search.svg` and the two `questlog-*-sprite.png` files). Gatsby publishes everything in `static/`, so add only files a page uses. PostHog's `contents/` docs, its published brand files and its other unused `static/` art were removed (they remain in git history). Do not re-enable the old CMS, customer, analytics, billing, or notification integrations as a side effect of a change.

## Catalog changes

- Keep app mapping in `quirq.apps.json`; avoid separate hard-coded app lists in menus, search, or the homepage.
- Keep project groups and phase overrides in `quirq.projects.json`; refresh phases with `pnpm projects:sync`. A hand-set `phase` needs a `phaseReason`.
- Live state on `/v0` and `/projects`, the organization README on the desktop (`.github/profile/README.md`), and app docs (READMEs and other Markdown files) are read in the browser from public files on raw.githubusercontent.com. The repository list behind the desktop, Home base, search, and app pages, and each repository's doc list (one git trees request per repository opened), are read in the browser from GitHub's public REST API (anonymous, 60 requests an hour per visitor). Do not add a token or backend for them.
- Third-party code that can't be added with `pnpm` (the workspace trust policy stops on existing dependencies) is vendored unmodified under `src/vendor/`, with a README and `provenance.json` of npm integrity and file hashes. Keep it unmodified and excluded from ESLint and Prettier.
- Lists of apps in the UI use `useQuirqApps()` / `useQuirqCatalog()` from `src/lib/quirqLiveApps.ts`, so they follow the organization live. `getQuirqApps()` is the build's snapshot, for routes and other build-time code.
- Refresh the generated snapshot with `pnpm apps:sync`. Do not hand-edit repository data or invent a deployment URL.
- After hiding a repository, run `pnpm apps:sync` (or the offline `pnpm apps:prune`) so its README text leaves the bundled snapshot; `pnpm apps:check` fails until then.
- Only public repositories belong in the snapshot. Never commit tokens or private repository metadata.
- A repository page displays metadata and a README. Opening it does not install or run the repository's code.
- **Rule: every link opens in a window on this site, the page in an iframe; never in a new tab by itself.** Open app, Launch and the desktop icons open an app's website at `/launch/<repository>` (`getLaunchTarget`); the organization README's links open at `/launch/<repository>` or `/launch/readme/<address>` (`readmeLinkTarget`); any other link to another site opens at `/launch/web/<address>` through the one click listener `openExternalLinksInWindows` in `gatsby-browser.tsx`. Before framing, the window asks `/api/frame-check` (`src/api/frame-check.ts`, the site's only server code) whether the page's `X-Frame-Options` and CSP `frame-ancestors` allow this site; a page that refuses (GitHub, Innernet, this site), can't be reached, isn't there, isn't https or never finishes loading (20 s) shows **Oops** with an **Open in new tab** button; a frame the network drops shows the browser's own error page under the same Open in new tab button. Origins in `frameOrigins` (exact quirq.dev subdomains, never a shared host such as `*.vercel.app`) are framed without asking; `launchMode: "window"` takes effect only on them. Frame only an app's launch URL, a link the profile README itself has, or a page a click on this site opened (its address travels in the navigation's state): never an address someone else put in the URL, which offers a new tab instead, and never this site's own host. Keep the frame check limited to public https hosts and to status and headers; keep `vercel.json`'s CSP `frame-src https:` and `frame-ancestors 'self'`. The `embed` App tab still requires an explicit per-repository setting.
- Custom app templates belong under `src/templates/` and receive `pageContext.app`. Keep direct URLs and window behavior working.
- Restart Gatsby after route changes. Browsers follow GitHub live; rebuild and deploy to refresh the snapshot that server rendering and each page's first paint use.
- A new public repository in the organization fails `pnpm projects:check` (and so `pnpm build`) after `pnpm apps:sync` until it is placed in a group in `quirq.projects.json` and `pnpm projects:sync` has run.

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
- Links to other sites keep `target="_blank" rel="noopener noreferrer"` (`Link` and `OSButton asLink` add it to any absolute `http(s)://` or `//` URL; spread `NEW_TAB` from `src/lib/externalLinks.ts` onto a raw `<a>`), so a Ctrl/Cmd- or middle-click, or a browser without JavaScript, still opens a new tab; a plain click opens a window (see the rule above). A link that must open a real new tab, such as an Open in new tab button, carries `data-new-tab` (on the link or around it; a context menu item takes `newTab: true`).
- Describe the user-visible result, relevant validation, and any remaining limitations in pull requests.
- Preserve license and attribution notices for inherited code and assets.
- Never approve a pull request, even when asked to; approvals are human (quirq-ai/gate#29: product PRs need one approval). Give review feedback as comments, not "Request changes", and say when a PR is ready for a person's approval.

The inherited [apps](agents/apps.md), [components](agents/components.md), [styling](agents/styling.md), and [window system](agents/windows.md) guides can help explain shared code. They are historical reference: their PostHog data sources, integration steps, and contributor approval requirements do not override this file or the active quirq implementation.
