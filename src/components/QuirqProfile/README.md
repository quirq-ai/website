# quirq profile

The organization's GitHub profile README (`quirq-ai/.github`, `profile/README.md`), written on the desktop's plain background. The desktop icons, the dock and app windows sit on top of it. `components/Desktop` mounts it in the desktop's scrolling layer; on phones the icon grid scrolls above it.

```tsx
<QuirqProfile />
```

## Data

`useProfileReadme()` reads the file live in the visitor's browser from raw.githubusercontent.com, at the default branch (`HEAD`), the same way `/v0` reads its live state. There is no token or backend. GitHub caches the file for up to 5 minutes, so an edit to the profile README shows on the next visit after that.

- Server rendering and the first client render show nothing, so hydration matches. The README fades in once it arrives.
- The last copy is kept in `localStorage` (`quirq.profileReadme.v1`), so a return visit paints it at once while the live copy loads.
- If GitHub can't be reached and nothing is cached, it shows the organization name and a link to the organization on GitHub.

## Rendering

The README mixes Markdown and GitHub-flavored HTML. `react-markdown` parses both (`remark-gfm`, `rehype-raw`), and `rehype-sanitize` keeps only GitHub's allowed elements and attributes, so scripts and event handlers never reach the page. Relative links and images resolve against the profile folder on GitHub.

The styling follows the README's own structure rather than generic prose:

- The title is a large display line, and the first paragraph is the lead.
- A paragraph made only of links (separated by `·`) becomes a row of app icons, drawn like the desktop's own. A link to an app in the catalog (its website, launch address or repository) takes that app's glyph and color; other links take a glyph for what they are about, such as install steps, discussions, security or research. Labels drop their trailing arrows.
- Like the other apps, the icons open in windows. A link to an app's website opens that app the way Launch does (`/launch/<repository>`, or a new tab for an `external` app). Another web page opens in a window of its own that frames it (`/launch/readme/<address>`); the window frames only a link the README itself has, and offers Open in new tab. GitHub refuses to be framed, so its links, like mail links, open in a new tab; a link to this site opens here. The rules live in [`src/lib/quirqReadmeLinks.ts`](../../lib/quirqReadmeLinks.ts).
- Images are framed with rounded corners and a soft shadow.
- Tables sit in a rounded panel, and code blocks are dark with a **Copy** button beside them.
- Everything after the final `---` rule is set as a small footer.

Right-clicking the README gets the browser's menu (copy, open link) rather than the desktop's. Light and dark themes use the site's text tokens.
