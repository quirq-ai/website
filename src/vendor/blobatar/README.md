# Blobatar 2.7.0

The actual, unmodified browser ESM bundles from the MIT-licensed [Blobatar project](https://github.com/Alain00/blobatar), the same files [Euler](https://github.com/quirq-ai/euler) vendors. `src/lib/quirqAvatar.ts` is the only consumer.

- Package: `blobatar@2.7.0`, upstream revision `ebb7ea4808b1263629fc8fa65e2398b9cbdb6f6b`.
- Source: the [published npm archive](https://registry.npmjs.org/blobatar/-/blobatar-2.7.0.tgz). It was checked against npm's SHA-512 integrity value, and every file here matches the SHA-256 hashes in [provenance.json](provenance.json), which match Euler's copy.
- Files: `dist/index.js` (renderer and trait sampler), `dist/expression.js` (expression poses), their source maps, and the package [LICENSE](LICENSE). Neither bundle imports anything.

Why vendored rather than a package dependency: adding any package with `pnpm` in this repository currently stops on the workspace `trustPolicy: no-downgrade` check for existing dependencies (`@headlessui/react@1.7.19`, `semver@6.3.1`), unrelated to Blobatar. Vendoring avoids changing that policy. Blobatar itself is published with npm provenance by a trusted publisher.

These files are excluded from ESLint and Prettier. To update, choose an explicit version, verify the new archive's integrity, copy the same files and license, and update `provenance.json` and this README.
