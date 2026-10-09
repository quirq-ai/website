# quirq app mapping

The GitHub organization is the catalog. Its public repositories become apps in Home Base, the desktop, and navigation. The shared window system, themes, and app-specific URLs stay available.

## Two files to know

- `quirq.apps.json`: organization and your app choices. Edit this to change a name, URL, icon, color, or visibility.
- `src/data/quirq-repositories.json`: generated public GitHub metadata and README snapshot. Refresh it with the sync command; do not hand-edit it.

```sh
pnpm apps:sync
pnpm apps:check
pnpm apps:test
```

The first command fetches every page of the organization's public repositories and each visible repository's README. The second validates the saved data and mapping without network access. Restart Gatsby after adding an app or changing its path, then rebuild and deploy to publish the updated catalog. Between deployments, browsers follow GitHub live: the desktop, Home Base, and search read the repository list from GitHub's public API and apply this same mapping, app pages read their README from raw.githubusercontent.com, and a repository created after the build opens at `/apps/<repository>` through the live app page. Server-rendered pages keep the committed snapshot until the next deploy.

The optional `GITHUB_TOKEN` environment variable increases GitHub API limits. It belongs only in your terminal or build environment. It is never included in the snapshot or browser bundle. Private repositories are rejected even when a token can read them.

## Customize one app

The key must match an actual repository name in the organization. Unlisted repositories appear automatically, live in browsers and in built pages after the next sync. A mapping for a repository that does not exist will not create an app.

```json
{
    "organization": "quirq-ai",
    "name": "quirq",
    "frameOrigins": ["https://docs.quirq.dev"],
    "defaults": {
        "category": "Apps",
        "launchMode": "window",
        "includeForks": true,
        "includeArchived": false,
        "excludeRepositories": [".github"]
    },
    "repositories": {
        "xo-space": {
            "name": "XO Space",
            "path": "/xo-space",
            "icon": "planet",
            "color": "purple",
            "featured": true,
            "window": { "width": 1080, "height": 760 }
        },
        "infra-config": { "hidden": true }
    }
}
```

| Setting | Behavior |
| --- | --- |
| `name`, `description`, `category` | Optional display overrides. GitHub name and description are the default. |
| `path` | A unique local URL, such as `/xo-space` or `/lab/instants`. Default: `/apps/<repository>`. |
| `icon` | A glass glyph by name, such as `terminal`, `telescope`, or `planet`. [`QuirqAppIcon`](../src/components/QuirqAppIcon/README.md) lists them all. Unset apps show a `folder`. |
| `color` | `blue`, `purple`, `lilac`, `orange`, `yellow`, `red`, `salmon`, `teal`, `seagreen`, `green`, or `pink`. Unset apps get a stable color. |
| `featured` | Highlights the app in Home Base, and among the desktop icons when it has a website. All visible repositories remain in the catalog. |
| `hidden` | Removes this repository from app routes, Home Base, navigation, and search after Gatsby regenerates pages. |
| `launchUrl` | Optional HTTP(S) destination. Defaults to the GitHub repository's homepage; set `null` to disable launching. |
| `launchMode` | Open app, Launch and the desktop icon always open the launch URL in the app's own window on this site (`/launch/<repository>`). `window` (quirq-ai's default): frame it straight away; this takes effect only on an origin listed in `frameOrigins`, and any other launch URL is treated as `external`. `external`: ask `/api/frame-check` first and show **Oops** with Open in new tab if the site refuses frames. A launch URL on a shared hosting platform (`*.vercel.app`, `*.github.io` and the rest of `SHARED_HOST_SUFFIXES` in `src/lib/frameCheck.ts`) always shows Oops with Open in new tab, so give an app a quirq.dev address to open it in a window. `embed`: an App tab inside the repository's page; set it on the individual repository only. |
| `component` | Optional existing component under `src/templates/`, such as `src/templates/XOSpace.tsx`, for a completely bespoke app page. The Gatsby pipeline validates that the file exists. |
| `window` | Optional `width` and `height` in pixels for the restored window. Dimensions fit within the desktop, and multiple open windows share its available width. The window can be expanded and restored. |

`frameOrigins` lists the origins known to allow this site's frames, so their windows skip the frame check. Each entry is an exact `https://` origin on a quirq.dev subdomain (not `www`), with no path or wildcard, and never a host on a shared platform such as `*.vercel.app`, where anyone can claim a name. Every other https page, whether an app's launch URL, a link in the profile README or any link elsewhere on the site, opens in a window too, after `/api/frame-check` ([`src/api/frame-check.ts`](../src/api/frame-check.ts)) has read its `X-Frame-Options` and CSP `frame-ancestors` headers. `vercel.json` sends a CSP `frame-src https:` (a test checks it) and `frame-ancestors 'self'`, so no other site can frame this one. Repository mapping keys match GitHub names in any case.

A site's own security policy (`X-Frame-Options`, or CSP `frame-ancestors`) can prevent it from appearing in an iframe. The window then shows **Oops** with an Open in new tab button instead of the browser's refusal; GitHub, Innernet and this site are such sites. The frame check reads only a response's status and headers, from public https hosts (every address a host resolves to must be public). On a host without serverless functions the check can't be asked: the window frames the page anyway and keeps Open in new tab in its bar. Opening a repository page or a launch window does not install or start its code.

## Repository types

Each repository's type is the organization's `role` custom property on GitHub (single select: `project`, `agent`, `tool`, `library`, `docs`, `config`; required, default `project`). It is set on GitHub, by people or by automation, never in `quirq.apps.json`. The site reads it from `custom_properties.role` in the same repository list as everything else: `pnpm apps:sync` saves it in the snapshot as `role`, and browsers read it live. A value the site doesn't know (`QUIRQ_ROLES` in `scripts/lib/quirq-catalog.mjs`, with names and meanings in `src/lib/quirqRoles.ts`) is ignored. A live list that leaves custom properties out keeps the type the build saved.

What a type changes:

- **Home base** filters by type (All apps, Projects, Agents, Tools, Libraries, Docs, Config; only the types some app has) and each card shows its type as a badge. While no app's type is known, the filters and cards fall back to the mapping's `category`.
- **Order**: after featured apps, apps are listed by type in that order (projects first, config last), then by name, on the desktop, in Home base and in the menus. An app whose type isn't known sorts with projects.
- **Repository window**: the type is a badge in the details beside the tabs, in place of the category; hovering it shows what the type means.
- **Search** matches a type's value, name and plural ("tool", "Tools").

## What is included

Public, non-archived repositories are included by default. Forks remain included because quirq's Docs and XO Space are forks. `.github` is organization configuration and is excluded unless `excludeRepositories` is set; quirq-ai sets it to `[]` to show every public repository. Use `hidden` or `defaults.excludeRepositories` to hide infrastructure repositories you do not want presented as apps; relevance is an explicit mapping choice, not guessed from a repository's name. After hiding a repository, run `pnpm apps:sync`, or `pnpm apps:prune` when GitHub is unreachable, so its README text leaves the snapshot that every page bundles. `pnpm apps:check` fails until you do.

Names, descriptions, homepage URLs, language, topics, star counts, update times, default branches, and README text come from GitHub. Missing descriptions stay empty unless you provide an override. The featured apps have short editorial descriptions based on their synced READMEs; these remain in the mapping when you refresh GitHub data. No deployments or product claims are invented. README fetch failures leave the repository link available. API, ownership, pagination, or mapping failures leave the previous snapshot untouched.

`src/lib/quirqApps.ts` exposes `getQuirqApps()`, `getQuirqApp(pathOrSlug)`, `quirqConfig`, and the snapshot's fetch time. `src/lib/quirqLiveApps.ts` exposes the live catalog to components: `useQuirqApps()`, `useQuirqCatalog()` (with the repository count, read time, and whether it is live), and `findQuirqApp(pathOrSlug)`. Both build-time routing and the UI use the same mapping logic in `scripts/lib/quirq-catalog.mjs`, so the URLs in the catalog match the generated pages.
