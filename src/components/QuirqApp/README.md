# Repository app windows

The default app template reuses Explorer and the original window controls. Its content
comes from GitHub repository metadata and a synced README. It supports three presentations:
`overview` (app profile), `reader` (document with repository sidebar), and `gallery`
(a colorful showcase). The presentation belongs to each entry in `quirq.apps.json`.

An explicit `launchUrl` with `launchMode: "embed"` adds an embedded app tab. A launch URL
otherwise opens externally. Embeds depend on the destination allowing framing; an external
open button is always available. A repository with no destination opens its source on GitHub.
Neither a repository nor a README is executable app code.

READMEs render through react-markdown with raw HTML disabled. Links and images resolve
against the repository and README directory, with only HTTP(S) image URLs accepted.

For a completely different app experience, set `component` to a project-relative TSX
template in the mapping. It receives `pageContext.app` and still gets the normal desktop
window, title, independent route, themes, and configurable window dimensions.
