# QuirqInfraV0

The "quirq infra" app at `/v0`: a guide to quirq infra (qq) v0 and a live view of it running. The catalog maps the
`infra-config` repository to this component through `src/templates/QuirqInfraV0.tsx` (see `quirq.apps.json`).

## Tabs

- **Overview:** what v0 is, how one change travels through the 13 repos, and the v0 exit test with its status.
- **Live:** for xo-space and innernet, the tree status and post-submit builders, the lkgr and canary pointers, and
  the last 7 days of the daily canary with the latest run's stages.
- **The 13 repos:** each repo's job, the Chromium piece it is modeled on, and what is still open.
- **Guide:** landing a change, what a closed tree means, how shipping works, and v0's known limits.

## Data

- `data.ts` holds the written content, dated by `AS_OF`. The repo roles, the walk-through and the Chromium
  counterparts are adapted from the infra map in
  [quirq-ai/research](https://github.com/quirq-ai/research/tree/main/infra/output/app/infra-map) (MIT); the status
  lines come from that repo's v0 status report. Update them together when v0 moves.
- `live.ts` fetches in the visitor's browser from `raw.githubusercontent.com`: gardener's `tree-status` branch
  (`status/<repo>.json`) and release's `release-state` branch (`pointers/<repo>/lkgr.json`,
  `pointers/<repo>/channels/canary.json` and `canary/<repo>/runs/<date>.json`). Those files are public, so the page
  needs no token or backend, and the build never touches the network. A missing file reads as "none"; a failed fetch
  shows a message with links to the same files on GitHub.

UI uses the shadcn primitives in `src/components/ui/`.
