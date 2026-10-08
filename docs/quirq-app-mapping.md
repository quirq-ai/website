# quirq app mapping

The GitHub organization is the catalog. Its public repositories become apps in Home Base, the desktop, and navigation. The shared window system, themes, and app-specific URLs stay available.

## Two files to know

- `quirq.apps.json`: organization and your presentation choices. Edit this to change a name, URL, icon, color, page style, or visibility.
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
    "defaults": {
        "category": "Apps",
        "presentation": "overview",
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
            "presentation": "overview",
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
| `featured` | Highlights the app in Home Base and desktop shortcuts. All visible repositories remain in the catalog. |
| `hidden` | Removes this repository from app routes, Home Base, navigation, and search after Gatsby regenerates pages. |
| `presentation` | `overview`, `reader`, or `gallery`. These are reusable starting points for individual app styles. |
| `launchUrl` | Optional HTTP(S) destination. Defaults to the GitHub repository's homepage; set `null` to disable launching. |
| `launchMode` | How Open app and Launch open the launch URL. `window`: its own window on this site, in an iframe at `/launch/<repository>` (quirq-ai's default). `external`: a new tab (the default when `defaults` doesn't set one). `embed`: an App tab inside the repository's page; set it on the individual repository only. |
| `component` | Optional existing component under `src/templates/`, such as `src/templates/XOSpace.tsx`, for a completely bespoke app page. The Gatsby pipeline validates that the file exists. |
| `window` | Optional `width` and `height` in pixels for the restored window. Dimensions fit within the desktop, and multiple open windows share its available width. The window can be expanded and restored. |

A site's own security policy (`X-Frame-Options`, or CSP `frame-ancestors`) can prevent it from appearing in an iframe, in a launch window or an App tab. Both keep an Open in new tab link; for such a site, set `"launchMode": "external"` on that repository. Only a catalog launch URL, or a page the organization's profile README links to (its app icons on the desktop open such a page at `/launch/readme/<address>`), is ever framed; never an address taken from the URL. GitHub refuses all framing, so repository links open in a new tab. Opening a repository page or a launch window does not install or start its code.

## What is included

Public, non-archived repositories are included by default. Forks remain included because quirq's Docs and XO Space are forks. `.github` is organization configuration and is excluded unless `excludeRepositories` is set; quirq-ai sets it to `[]` to show every public repository. Use `hidden` or `defaults.excludeRepositories` to hide infrastructure repositories you do not want presented as apps; relevance is an explicit mapping choice, not guessed from a repository's name. After hiding a repository, run `pnpm apps:sync`, or `pnpm apps:prune` when GitHub is unreachable, so its README text leaves the snapshot that every page bundles. `pnpm apps:check` fails until you do.

Names, descriptions, homepage URLs, language, topics, star counts, update times, default branches, and README text come from GitHub. Missing descriptions stay empty unless you provide an override. The featured apps have short editorial descriptions based on their synced READMEs; these remain in the mapping when you refresh GitHub data. No deployments or product claims are invented. README fetch failures leave the repository link available. API, ownership, pagination, or mapping failures leave the previous snapshot untouched.

`src/lib/quirqApps.ts` exposes `getQuirqApps()`, `getQuirqApp(pathOrSlug)`, `quirqConfig`, and the snapshot's fetch time. `src/lib/quirqLiveApps.ts` exposes the live catalog to components: `useQuirqApps()`, `useQuirqCatalog()` (with the repository count, read time, and whether it is live), and `findQuirqApp(pathOrSlug)`. Both build-time routing and the UI use the same mapping logic in `scripts/lib/quirq-catalog.mjs`, so the URLs in the catalog match the generated pages.
