# @pierre/trees 1.0.0-beta.6

The actual, unmodified files of [@pierre/trees](https://trees.software) (Apache-2.0, from [pierrecomputer/pierre](https://github.com/pierrecomputer/pierre)), the path-first file tree that lists a repository's docs in its app window, and of its three runtime dependencies. `src/components/QuirqApp/DocsTree.tsx` is the only consumer, through [`react.js`](react.js), and loads it in the browser only, after mount.

| Package | Version | License | npm provenance | Files here |
| --- | --- | --- | --- | --- |
| `@pierre/trees` | 1.0.0-beta.6 | Apache-2.0 | no | `dist/**/*.js`, `package.json`, `LICENSE.md`, `NOTICE.md` |
| `preact` | 11.0.0-beta.0 (the exact version trees depends on) | MIT | no | the ESM builds of `preact`, `preact/hooks` and `preact/jsx-runtime`, `package.json`, `LICENSE` |
| `preact-render-to-string` | 6.6.5 | MIT | yes | `dist/index.module.js` (browser), `dist/index.mjs` (Gatsby's server bundle), `package.json`, `LICENSE` |
| `@pierre/theming` | 1.0.0 | Apache-2.0 | no | `dist/color.js` and the two modules it imports, `package.json`, `LICENSE.md` |

- Source: the published npm archives. Each archive matched npm's SHA-512 integrity value, and every file here matches the SHA-256 hash in [provenance.json](provenance.json). Type declarations and source maps are left out.
- Layout: the packages sit in `./node_modules`, so they resolve each other (trees' `preact` is this Preact 11 beta, not anything else in the site) while `react` still resolves to the site's own React. Gatsby compiles files under a `node_modules` folder as dependencies, without the site's React JSX transform. `.gitignore` re-includes this one folder.
- `react.js` is the entry point: it re-exports `@pierre/trees/react` (`FileTree`, `useFileTree` and the selection, search and selector hooks).

Why vendored rather than a package dependency: adding any package with `pnpm` in this repository currently stops on the workspace `trustPolicy: no-downgrade` check for existing dependencies (on 2026-10-09, `detect-port@1.6.1` under `gatsby`), unrelated to Trees. Vendoring avoids changing that policy, as for [Blobatar](../blobatar/README.md).

Trees and Preact 11 are betas: pin an exact version when updating. These files are excluded from ESLint and Prettier. To update, choose explicit versions (Trees pins its Preact), verify each new archive's integrity, copy the same kinds of files, and update `provenance.json` and this README.
