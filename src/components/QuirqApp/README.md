# Repository app windows

The default app template reuses Explorer and the original window controls. Its content
comes from GitHub repository metadata and a synced README. It supports three presentations:
`overview` (app profile), `reader` (document with repository sidebar), and `gallery`
(a colorful showcase). The presentation belongs to each entry in `quirq.apps.json`.

Open app follows the entry's `launchMode`: `window` opens the launch URL in its own window on
this site (`/launch/<repository>`, an iframe), `external` opens it in a new tab, and `embed`
(set per repository) adds an App tab to this page. Framing depends on the destination
allowing it, so both the launch window and the App tab keep an Open in new tab link. A
repository with no destination opens its source on GitHub, always in a new tab, since GitHub
refuses to be framed. Neither a repository nor a README is executable app code.

`RoutedApp.tsx` holds what the client-only routes `/apps/*` and `/launch/*` share: finding the
repository named in the URL in the live catalog, titling the window after it, and the screen
shown while looking or when there is nothing to show.

READMEs render through react-markdown with raw HTML disabled. Links and images resolve
against the repository and README directory, with only HTTP(S) image URLs accepted.

For a completely different app experience, set `component` to a project-relative TSX
template in the mapping. It receives `pageContext.app` and still gets the normal desktop
window, title, independent route, themes, and configurable window dimensions.
