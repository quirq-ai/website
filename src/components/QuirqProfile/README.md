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
- A paragraph made only of links (separated by `·`) becomes a row of pill buttons; links set in bold are the filled, primary ones.
- Images are framed with rounded corners and a soft shadow.
- Tables sit in a rounded panel, and code blocks are dark with a **Copy** button beside them.
- Everything after the final `---` rule is set as a small footer.

Right-clicking the README gets the browser's menu (copy, open link) rather than the desktop's. Light and dark themes use the site's text tokens.
