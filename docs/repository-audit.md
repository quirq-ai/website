# quirq repository audit

Audited on 2026-10-10 against `main` at `a66ac87`. This audit targets inactive first-party code, obsolete PostHog integrations, unused assets, and development tooling. It preserves the active quirq desktop and the notices attached to inherited material.

## Method

1. Read the repository contract, README, catalog mapping, build configuration, and component documentation before changing code. Preserve pre-existing local work.
2. Trace literal static imports, re-exports, `require()` calls, and dynamic imports from Gatsby browser/SSR/build hooks, HTML, the four allowed filesystem pages, catalog/custom templates, API routes, package commands, and their regression tests.
3. Inspect reachable shared components manually. A file can be imported while most of its old product, account, or commerce branches are unused.
4. Cross-check assets against the final import graph, CSS references, inline SVG, runtime URLs, and dynamic class names. Gatsby copies all of `static/`, even when a file is never imported.
5. Trace direct package imports, framework peers, config plugins, CLI usage, and the imports in Gatsby's generated browser/server templates. Prune the lockfile to the retained dependency closure without upgrading retained packages or relaxing the workspace trust policy.
6. Validate snapshots, source reachability, vendor hashes, tests, a clean production build, and real browser behavior.

Git history retains the removed material; keeping an inactive copy inside the build tree is unnecessary.

## Findings and cleanup

| Area                         | Finding                                                                                                                                                             | Result                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pages and content components | Marketing, product, pricing, careers, customers, community, merch, tutorials, and legacy docs were excluded from routes but still tracked.                          | Removed unreachable pages, templates, components, data, hooks, and old tests. Kept the explicit quirq route allowlist and collision protection.                                                                    |
| Gatsby and local plugins     | Old CMS, Algolia, OG rendering, monorepo ingestion, and publishing helpers remained inactive.                                                                       | Removed their helpers and local plugin workspaces. Active builds use saved public quirq snapshots.                                                                                                                 |
| Shared desktop shell         | Reachable modules carried unused auth, chat, notifications, feature flags, cart/order controls, PDF presentation, signup attribution, and old PostHog app defaults. | Trimmed unused branches and types from App, Explorer, HeaderBar, Link, icons, utilities, and SEO. Removed the unused Kea/Redux wrapper, retired skin branches, and former PostHog parent-embedding message bridge. |
| Catalog navigation           | The App context's menu still read the saved catalog even though current UI rules require live browser data.                                                         | Use the shared live catalog hook, retaining the snapshot as the initial fallback.                                                                                                                                  |
| Artwork and CSS              | Old product/customer art, audio, font declarations, DocSearch/QuestLog CSS, and marketing utilities were unused.                                                    | Removed local legacy media and dead style blocks. Kept active theme tokens, glass artwork, Markdown styles, window animations, and dynamic color classes.                                                          |
| Static files                 | Three legacy images were referenced only by dead CSS.                                                                                                               | Removed those images; retain approved branding, theme initialization, robots, and hosting headers. Store README screenshots in `docs/images/`.                                                                     |
| Tooling and dependencies     | The manifest exposed obsolete CMS/publishing commands, Storybook, Vale, analytics, editors, charts, and other removed feature dependencies.                         | Remove unused commands, configs, patches, and direct dependencies; preserve the pinned Node/pnpm workflow.                                                                                                         |
| Documentation                | Historical guides described removed PostHog services and contributor processes.                                                                                     | Replace them with current development guidance, component READMEs, this audit, and an illustrated quirq README. Preserve attribution and private vulnerability reporting.                                          |

The window lifecycle remains shared infrastructure: route changes, history, launch authorization, expand/restore, minimize/reopen, close, and multiple windows remain available. Retained icon-only navigation and window controls now have accessible names. Explorer now uses one constrained scroll viewport; the former narrow-width outer wrapper belonged to its removed sidebar composition. Disconnected drag/resize handlers and unused appearance settings were removed. Compact menus now follow live catalog changes, and in-page search closes on outside clicks and cancels pending highlighting on cleanup.

## Intentionally retained upstream material

-   **Desktop implementation:** flex window management, glass icon rendering, shared controls, context menus, scrolling, theme tokens, animation, and responsive chrome all serve active quirq views.
-   **`@posthog/icons`:** the control glyphs are used by active buttons and menus. This is an artwork dependency, with no analytics client or service initialization.
-   **Typography:** Gatsby loads IBM Plex Sans. Inactive font declarations were removed without enabling a previously unloaded remote font.
-   **Screensaver:** the active screensaver displays the approved quirq mark as inline SVG; it does not depend on the removed legacy sprites.
-   **Licenses:** `LICENSE.posthog` and attribution remain required for retained inherited code and artwork. The quirq branding is reserved, and original quirq additions keep their separate license.
-   **Vendor packages:** Blobatar, @pierre/trees, and its runtime dependencies remain unmodified with pinned provenance and their own licenses/notices. The source check verifies their recorded file hashes.
-   **Public repository data:** metadata and Markdown in the committed snapshots belong to the repositories they describe. The audit does not rewrite or remove external content based on a keyword match.

No PostHog CMS, analytics, billing, customer, mail, or notification service is configured by the active site.

## Keep the tree relevant

`pnpm source:check` runs in the prebuild hook. It checks unresolved local imports, unreachable first-party executable files, unused or undeclared direct dependencies, and recorded vendor file integrity. Framework and CLI roots are explicit so discarded tests or helpers cannot keep an obsolete feature alive accidentally. Gatsby's copied cache templates are also inspected: their navigation, scrolling, event, script, server utility, and polyfill modules must resolve from the project root under the existing webpack configuration.

When adding a Gatsby page, API route, custom template, script, or genuine tool entrypoint, update the roots deliberately. Keep third-party packages separate from first-party source. Do not silence a failure with a broad directory exclusion.

## Verification scope

The command's guarantee is about file-level reachability and declared dependencies. It does not prove that every export, generic component prop, CSS selector, or third-party package function executes. Manually inspecting reachable components and runtime asset references is still necessary, especially for nonliteral dynamic imports and externally supplied Markdown.

Live GitHub data and linked app deployments can change independently. Anonymous API limits and a destination's framing headers are operational constraints, not dead code. Browser checks use the real UI and retain its external fallback.

A standalone `pnpm exec tsc --noEmit` also exposed an inherited toolchain limitation: TypeScript 4 cannot parse the TypeScript 5 const type parameters in the installed `@types/d3-dispatch` dependency. It stops before application type analysis. This audit does not claim a passing typecheck or include a TypeScript migration; Gatsby production compilation and the configured regression suites are verified separately.

## Cleanup totals and validation

| Measure                        | Before               | After / removed                                         |
| ------------------------------ | -------------------- | ------------------------------------------------------- |
| Tracked files deleted          | 2,682 baseline files | 2,425 removed                                           |
| Bytes in deleted files         | —                    | 72.62 MiB removed                                       |
| First-party source/doc cleanup | —                    | 1,689 files removed, including 1,599 executable modules |
| Asset/style cleanup            | —                    | 583 unused files removed; 49.07 MiB                     |
| Direct dependencies            | 241                  | 63                                                      |
| Locked packages                | 4,002                | 1,808                                                   |
| Workspace importers            | 8                    | 1                                                       |
| Global CSS lines               | 3,279                | 900                                                     |
| Dynamic utility safelist lines | 635                  | 35                                                      |

Counts for source, assets, and tooling classify different portions of the deletion set; use the Git diff for the complete file list. Byte totals count deleted baseline files, excluding reductions within edited files or new README screenshots.

`@posthog/icons` remains the only direct PostHog package. Gatsby's compiler/generated runtime requirements are explicitly retained. All retained dependency versions and integrity records match the audit baseline; the newly explicit `gatsby-legacy-polyfills` and `event-source-polyfill` declarations use Gatsby's already locked versions.

Validation uses Node 24.21.0 and pnpm 10.23.0. The frozen install, catalog/project checks, source/runtime/vendor checks, and all 84 regression tests pass. Changed JavaScript/TypeScript files pass ESLint with zero errors (existing type-style warnings remain). A clean production build generates all 40 HTML pages and the frame-check function successfully. The source check and tests also pass after Gatsby generates its runtime modules.

Browser verification covers 1440 × 1000 and 390 × 844 viewports, light and dark appearance, Home filtering, dock search and dismissal, Projects, direct repository routes, Markdown selection from the vendored file tree, the avatar app, and the launch fallback. It verifies opening a second window, expand/restore, keyboard minimize/reopen, close, narrow-window scrolling, and the approved quirq screensaver. The final 404 page search opens and closes on an outside click. A local iframe harness verifies compact navigation and opens `vangogh`, a live repository absent from the saved snapshot. No browser console errors were recorded. The README uses actual light and dark screenshots of the production build.

The build retains existing Browserslist/baseline data-age and Babel deprecation warnings. The Tailwind vendor-scan warning is resolved by explicitly excluding third-party shadow-root/inline-styled code from utility scanning.
