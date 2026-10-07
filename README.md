# quirq home base

A customizable desktop for the apps, experiments, and open source projects in the [quirq GitHub organization](https://github.com/quirq-ai).

Repositories become app entries with their own URLs. The desktop icons, the Home window, and search all use the same catalog. A floating dock, after [Euler](https://github.com/quirq-ai/euler)'s, is the navigation bar: Home, Projects, search, and the list of open windows. The Home window follows Euler's Home: a greeting, the catalog at a glance, a card for every app, and a [Blobatar](https://blobatar.dev/) avatar you can make your own. The interface keeps the playful desktop experience: glass icons, wallpapers, light and dark themes, screensavers, appearance settings, and multiple app windows with expand, restore, and close controls.

Each app can have its own identity. Use a document view for Docs, a colorful showcase for an experiment, or a completely custom React page for a product. A shared data source does not require every app to look the same.

This is a **Gatsby 4 / React 18 website**, adapted from [PostHog/posthog.com](https://github.com/PostHog/posthog.com). It presents repository metadata and READMEs, and links to or embeds already deployed apps. Opening an entry does **not** clone, install, deploy, or run that repository, and the browser does not control the host operating system.

## Run locally

Prerequisites:

- Git.
- **Node.js 24.x**, matching [`.nvmrc`](.nvmrc) and the package engine.
- **pnpm 10.23.0**, pinned by `packageManager` in [`package.json`](package.json). Use pnpm for this workspace.

```sh
git clone https://github.com/quirq-ai/website.git
cd website
corepack enable
corepack prepare pnpm@10.23.0 --activate
pnpm install --frozen-lockfile
pnpm start
```

Open [http://localhost:8001](http://localhost:8001). The development server binds to `127.0.0.1`; it is local to your computer. Stop it with `Ctrl+C`.

The committed GitHub snapshot is enough to start and build the site. No GitHub token, PostHog account, CMS credentials, or environment file is required for the default local setup. Dependency installation still needs network access and can take time because the retained upstream workspace is large.

## How the data reaches the screen

```text
quirq-ai public GitHub repositories
                |
          pnpm apps:sync
                |
    src/data/quirq-repositories.json
                +
         quirq.apps.json
                |
    shared catalog validation and mapping
                |
      Gatsby creates one route per app
                |
 Home window + desktop + dock + search + app windows
```

1. **Sync:** the script fetches the organization's public repositories and the READMEs for visible entries.
2. **Snapshot:** the result is saved in a committed JSON file. Browsers and normal builds use this saved data rather than fetching the GitHub API.
3. **Mapping:** `quirq.apps.json` selects the organization and overrides presentation, visibility, paths, and launch destinations.
4. **Routes:** Gatsby generates each app page from that same mapped catalog. Home base and navigation use the same entries, so their links match the generated routes.

Public, non-archived repositories are included by default, including forks. `.github` is excluded. Repositories do not need an explicit mapping entry to appear after a sync. Use `hidden` or `defaults.excludeRepositories` to remove infrastructure or other entries that should not appear as apps. Private repositories are never included.

Only Home base (`/`), Projects (`/projects`), Appearance (`/display-options`), the 404 page, and catalog app routes are active. The `infra-config` repository maps to the quirq infra v0 app at `/v0`, a guide to v0 with its live state. The original PostHog marketing, billing, community, and CMS services are not part of this build.

## Refresh the catalog

```sh
pnpm apps:sync
pnpm apps:check
pnpm test
```

Review the changes to `src/data/quirq-repositories.json`, then commit the snapshot along with any mapping changes. Restart `pnpm start` after syncing or changing app routes. Run a new build and deployment to update the published site.

**GitHub changes do not update an existing deployment automatically.** `pnpm build` validates and builds the saved snapshot; it does not run a sync. This keeps builds reproducible and avoids requiring GitHub API access at build time.

The sync preserves the previous snapshot if repository fetching or validation fails. A missing README does not remove its repository from the catalog. For GitHub API rate limits, provide the optional `GITHUB_TOKEN` in the shell or CI environment that runs the sync. The token is not written to the snapshot or browser bundle.

## Make each app its own

Edit [`quirq.apps.json`](quirq.apps.json). Keys under `repositories` must match actual GitHub repository names. For example, this entry inside `repositories` gives XO Space a custom route, icon, showcase layout, and preferred restored dimensions:

```json
{
    "xo-space": {
        "name": "XO Space",
        "description": "Build, observe, and measure work across your local coding agents.",
        "path": "/xo-space",
        "icon": "rocket",
        "color": "purple",
        "category": "Apps",
        "featured": true,
        "presentation": "gallery",
        "window": { "width": 1080, "height": 760 }
    }
}
```

| Change | Mapping setting |
| --- | --- |
| Give an app its own URL | `path`, such as `/xo-space`; otherwise `/apps/<repository>` |
| Change its identity | `name`, `description`, `icon`, `color`, and `category` |
| Put it in the desktop's first column and first in the Home window | `featured: true` |
| Hide an entry everywhere | `hidden: true` |
| Choose a page layout | `presentation: "overview"`, `"reader"`, or `"gallery"` |
| Build a bespoke app page | `component: "src/templates/MyApp.tsx"` |
| Set a destination | `launchUrl`; defaults to the repository's GitHub homepage field |
| Disable the launch destination | `launchUrl: null` |
| Request an embedded app view | `launchMode: "embed"` on that repository, with a launch URL |
| Set restored window dimensions | `window: { "width": 1080, "height": 760 }` |

A custom component receives `pageContext.app` and stays within the shared desktop and window system. See [`src/templates/quirq-app.tsx`](src/templates/quirq-app.tsx) for the default template and [`src/components/QuirqApp`](src/components/QuirqApp) for the reusable app views. Windows fit within the available desktop; multiple open windows share that space.

Launch destinations open externally by default. An iframe only works when the destination permits embedding. The app view always provides an external launch option; repositories without a launch destination provide a GitHub source link.

For all supported values, validation rules, organization changes, and embedding details, read the [app mapping guide](docs/quirq-app-mapping.md).

## Projects and phases

`/projects` shows every repository the swarm is building, grouped as in [`quirq.projects.json`](quirq.projects.json), with a phase read from the repository's shape:

| Phase | Rule |
| --- | --- |
| Thought | Notes or a README only, no code |
| Prototype | Real code, but no CI |
| Built | Code with CI on GitHub |
| Shipping | Built, and onboarded to qq (`infra/repo.toml`), deployed, or in the daily canary |
| Project | Has users: at least 10 GitHub stars or at least 5 people committing (`projectRule`), checked first |

`pnpm projects:sync` reads each repository's default-branch file list and its commit authors with anonymous git clones that skip file contents, and star counts from one anonymous GitHub API request (falling back to the apps snapshot's counts). It needs no token and saves only counts, never names or emails, to `src/data/quirq-projects.json`. Commit that snapshot. People committing leaves out bots and the agent and automation emails listed under `automation`, and counts one person's several names and emails once. A `phase` with a `phaseReason` in `quirq.projects.json` overrides the computed phase. `projects:sync` and `projects:check` fail when a public repository is in no group and not marked `hidden`, so add new repositories to a group. Repositories in the daily canary also show their live tree status and canary commit, fetched in the browser from public state branches.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm start` | Run the development server at `http://localhost:8001` |
| `pnpm apps:sync` | Fetch public GitHub metadata and READMEs into the snapshot |
| `pnpm apps:check` | Validate the mapping and snapshot without network access; fails if a hidden repository still carries README text |
| `pnpm projects:sync` | Read every project's files, committers and stars without a token and save the phase snapshot |
| `pnpm projects:check` | Validate `quirq.projects.json` against the saved phase snapshot without network access |
| `pnpm apps:prune` | Offline: clear README text for repositories that are no longer visible apps, without refetching |
| `pnpm test` | Run catalog and app route regression tests |
| `pnpm apps:test` | Run catalog tests only |
| `pnpm test:app-routes` | Run Gatsby app route tests only |
| `pnpm build` | Validate the snapshot, then generate the production site in `public/` |
| `pnpm serve -H 127.0.0.1 -p 9000` | Preview an existing production build at `http://localhost:9000` |
| `pnpm clean` | Remove generated Gatsby cache and build output |

To check a production build locally:

```sh
pnpm test
pnpm build
pnpm serve -H 127.0.0.1 -p 9000
```

GitHub Actions runs the quirq infra presubmit (`website-presubmit`: a frozen pnpm install, `pnpm build`, whose prebuild runs `pnpm apps:check` and `pnpm projects:check`, and `pnpm test`) on pull requests and in the merge queue, and the same steps as `website-postsubmit` on every push to `main`, using Node 24.

Check Home base, an app route, search, Appearance, and narrow and wide layouts in both themes when changing the UI. The catalog and routing tests do not replace browser checks. Other scripts retained in `package.json` serve upstream functionality and are not required for this app's normal workflow.

## quirq infra (qq)

This repository is onboarded to [quirq infra](https://github.com/quirq-ai/infra-config), the build, test and land system shared by the quirq repositories:

- [`infra/repo.toml`](infra/repo.toml) is the qq manifest: one `site` target of kind `gatsby-site` and the Node toolchain pin. Read or change it only with `qqsync` from [quirq-ai/sync](https://github.com/quirq-ai/sync).
- The presubmit and post-submit workflows (`.github/workflows/qq-*.yml`) are generated in [quirq-ai/infra-config](https://github.com/quirq-ai/infra-config) and copied here. Change them there, never by hand.
- The landing rules on `main` (merge queue, squash merges, required checks) come from [quirq-ai/gate](https://github.com/quirq-ai/gate) `settings/github.toml`.

## Architecture

| File or directory | Responsibility |
| --- | --- |
| [`quirq.apps.json`](quirq.apps.json) | Organization, catalog defaults, and per-repository presentation overrides |
| [`scripts/sync-quirq-apps.mjs`](scripts/sync-quirq-apps.mjs) | Public GitHub API sync and snapshot validation command |
| [`scripts/lib/quirq-catalog.mjs`](scripts/lib/quirq-catalog.mjs) | Shared normalization, inclusion rules, URL checks, and mapping logic |
| [`src/data/quirq-repositories.json`](src/data/quirq-repositories.json) | Generated, committed GitHub snapshot; do not edit by hand |
| [`src/lib/quirqApps.ts`](src/lib/quirqApps.ts) | Typed catalog access shared by the UI and Gatsby |
| [`gatsby-config.js`](gatsby-config.js) | Active plugins, allowed source pages, and site metadata |
| [`gatsby-node.ts`](gatsby-node.ts) | Generates mapped routes and excludes inactive upstream pages and queries |
| [`src/templates/quirq-app.tsx`](src/templates/quirq-app.tsx) | Default generated app page and SEO |
| [`src/components/HomeBase`](src/components/HomeBase) | The Euler-style Home window: greeting, catalog summary, app cards, filters, and the avatar panel |
| [`src/components/Dock`](src/components/Dock) and [`src/components/QuirqAvatar`](src/components/QuirqAvatar) | The dock navigation bar (Home, Projects, search, open windows) and the Blobatar avatar and its editor |
| [`quirq.projects.json`](quirq.projects.json), [`scripts/lib/quirq-phases.mjs`](scripts/lib/quirq-phases.mjs) | Project groups, descriptions, phase overrides, and the phase rules |
| [`src/components/QuirqProjects`](src/components/QuirqProjects) | The projects-by-phase view at `/projects` |
| [`src/components/QuirqInfraV0`](src/components/QuirqInfraV0) | The quirq infra v0 guide and live view at `/v0` |
| [`src/components/QuirqApp`](src/components/QuirqApp) | Repository overview, reader, gallery, README rendering, and optional embed |
| [`src/components/QuirqAppIcon`](src/components/QuirqAppIcon) | Mapped icons in the existing glass icon style |
| [`src/components/QuirqSearch`](src/components/QuirqSearch) | Local catalog search and keyboard navigation |
| [`src/components/Desktop`](src/components/Desktop) | Desktop icons and wallpaper. The inherited top bar in [`src/components/TaskBarMenu`](src/components/TaskBarMenu) is no longer mounted; the dock replaced it |
| [`src/context/App.tsx`](src/context/App.tsx) and [`src/components/AppWindow`](src/components/AppWindow) | Shared app state, window lifecycle, layout, and controls |
| [`src/pages/display-options.tsx`](src/pages/display-options.tsx) | Appearance and personalization settings |
| [`vercel.json`](vercel.json) | Gatsby build and output configuration for Vercel |

The retained UI uses Tailwind CSS, existing theme tokens, container queries, and shared window templates. Start with the component READMEs before changing the desktop shell. Add custom app templates under `src/templates/`; adding arbitrary files to `src/pages/` does not make them active routes in this fork.

Gatsby's query extraction is limited to the active pages, SEO, and mapped templates. If a custom template introduces a GraphQL query in a shared component, update the allowlist in `gatsby-node.ts` deliberately. The normal catalog uses imported JSON and does not require GraphQL queries.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | Optional authentication for the sync script's public GitHub API requests. Set in the shell or CI environment running `pnpm apps:sync`. |
| `GATSBY_SITE_URL` | Optional absolute canonical site URL, such as your production `https://` domain. This is public metadata. |
| `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` | Vercel-provided hostname fallback when `GATSBY_SITE_URL` is absent. |
| `GATSBY_CPU_COUNT` | Optional Gatsby worker limit for machines with limited memory. |
| `NODE_OPTIONS` | Optional Node runtime options, such as a larger heap for a build on a machine with enough RAM. |

For Gatsby, configuration loads `.env.development.local` and `.env.development` during development, or `.env.production.local` and `.env.production` for a production build. The standalone sync script does **not** load these files; it reads `GITHUB_TOKEN` from its process environment. Keep tokens out of `quirq.apps.json`, committed files, and variables prefixed with `GATSBY_`, which are intended for browser use.

## Deploy on Vercel

1. Import `quirq-ai/website` into your Vercel team and select the repository root as the project directory.
2. Use **Node.js 24.x**, the repository's pinned pnpm version, and `pnpm install --frozen-lockfile` for installation.
3. Keep the settings in [`vercel.json`](vercel.json): **Gatsby**, build command **`pnpm build`**, and output directory **`public`**.
4. Optionally set `GATSBY_SITE_URL` to the production domain, then deploy.
5. Open Home base and a direct app URL in the deployment to check routing and the hydrated desktop UI.

The committed snapshot is deployed as part of the website. A normal Vercel build needs no GitHub API token. To publish new repositories or refreshed README content, sync locally or in a separate CI job, review and commit the changed snapshot, then redeploy. Linked app deployments are managed separately; this website does not deploy them.

## Troubleshooting

- **Wrong Node or pnpm version:** check `node --version` and `pnpm --version` against the prerequisites. Use the committed lockfile and do not replace it with an npm lockfile.
- **An app is missing or stale:** run `pnpm apps:sync` and `pnpm apps:check`, check its visibility settings, and restart Gatsby. Publish a new deployment for remote changes.
- **A route change does not appear:** stop the server, run `pnpm clean`, then run `pnpm start` again. The clean command removes generated output, not the catalog or mapping.
- **GitHub sync returns a rate limit error:** provide `GITHUB_TOKEN` in the sync process environment, then retry. The existing snapshot remains usable when the sync fails.
- **An embedded app is blank or refused:** use its external link and check the destination's embedding policy. A mapping entry cannot override that policy.
- **The build runs out of memory:** reduce Gatsby workers with `GATSBY_CPU_COUNT=2`; on a machine with sufficient RAM, set `NODE_OPTIONS=--max-old-space-size=8192`. Set these through your shell or hosting environment rather than changing the catalog.

## Upstream attribution and license

The desktop interface, much of the component library, artwork, and retained source originate from [PostHog/posthog.com](https://github.com/PostHog/posthog.com). quirq's organization catalog, mapping, app views, and active build configuration adapt that source for this project. This repository is not the official PostHog website.

The repository retains its [Apache 2.0 license](LICENSE), and the original upstream terms are preserved separately in [LICENSE.posthog](LICENSE.posthog). The upstream license contains different terms for the `contents/` directory and the rest of the website, including an explicit website reuse restriction. The repository license does not replace those upstream terms. Read [LICENSING.md](LICENSING.md) for the scope of each license before reusing or redistributing material; this project should not be described as wholly MIT- or Apache-licensed.

Inherited PostHog pages, components and scripts remain in `src/` and `scripts/` as an inactive design and implementation reference; they are excluded from the active page-generation pipeline. `static/` holds only files the active site loads, including three inherited PostHog images (`images/search.svg` and the two `questlog-*-sprite.png` files). PostHog's docs and blog content (`contents/`), its published brand files, its security reports and its other unused `static/` art were removed on 2026-10-05 and remain in git history. Upstream instructions and service integrations found in those files do not describe the quirq setup documented here.
