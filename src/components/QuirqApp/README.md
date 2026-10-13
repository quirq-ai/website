# Repository app windows

The default app template reuses Explorer and the original window controls. Its content
comes from GitHub repository metadata and the repository's Markdown docs. Every repository
window has the same layout: a header with the app's icon (in its color), name, summary and
actions, a row of tabs for its docs (Radix Tabs) with its details beside them (its type, the
`role` property on GitHub, as a badge once three types are in use, otherwise the mapping's category), and
the open doc. An app's identity comes from
its name, icon and color in `quirq.apps.json`, or a custom `component`.

Open app opens the launch URL in its own window on this site (`/launch/<repository>`, an
iframe), and `embed` (set per repository) adds an App tab to this page. Framing depends on the
destination allowing it, so the launch window asks `/api/frame-check` first and shows **Oops**
with an Open in new tab button for a site that refuses; View code opens GitHub's window, which
says so. Neither a repository nor a README is executable app code.

`RoutedApp.tsx` holds what the client-only routes `/apps/*` and `/launch/*` share: finding the
repository named in the URL in the live catalog, titling the window after it, and the screen
shown while looking or when there is nothing to show.

## Docs

`DocsBrowser.tsx` shows the repository's documentation. The bundled README renders on the
server and on first paint. After mount it reads the repository's Markdown files from GitHub's
git trees API (one anonymous request per repository per visit, in `src/lib/quirqDocs.ts`) and,
when there is more than one, lists them in a file tree beside the doc. `DocsTree.tsx` draws that
tree with the vendored [@pierre/trees](../../vendor/pierre-trees/README.md), loaded in the
browser only. Past 40 docs its folders start closed. Selecting a file, or following a link
to another doc, opens it in place. The current text of the open doc is read from
raw.githubusercontent.com, and the bundled README stays on screen if GitHub can't be reached.

`MarkdownDoc.tsx` formats one doc the way GitHub does:

- GitHub-flavored Markdown plus the HTML GitHub allows (`rehype-raw`, then `rehype-sanitize`
  with GitHub's schema, extended for `<picture>` sources, `align`, image sizes and fenced
  code's `language-*` class). Scripts, event handlers and unsafe URLs never reach the page.
- Fenced code highlighted with the site's dark Prism theme, labeled and copyable. Mermaid
  fences render as diagrams; Mermaid is loaded only for a doc that has one.
- Headings carry GitHub's anchor ids; `#anchor` links scroll within the doc.
- `align="center"` paragraphs, headings and divs are centered, and `<picture>` light and dark
  sources follow the site's theme.
- Relative links and images resolve against the doc's folder: images load from raw files,
  links to other docs open in place, and other repository files open on GitHub.

For a completely different app experience, set `component` to a project-relative TSX
template in the mapping. It receives `pageContext.app` and still gets the normal desktop
window, title, independent route, themes, and configurable window dimensions.
