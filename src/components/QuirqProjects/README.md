# QuirqProjects

The Projects page at `/projects` (`src/pages/projects.tsx`): every repository the swarm is building, grouped and
placed on a phase ladder, so a visitor can see how far each one has come.

## Phases

The rules live in `scripts/lib/quirq-phases.mjs` and are shared with the sync script and its tests: Thought (notes
only), Prototype (code, no CI), Built (code with CI), Shipping (built, and onboarded to qq, deployed, or in the daily
canary) and Project (users: at least 10 GitHub stars or at least 5 people committing, per `projectRule` in
`quirq.projects.json`, checked before the others). A hand-set `phase` with a `phaseReason` overrides the computed one.

## What each card loads

Each card shows more the further a project has come:

- **Every phase:** name, description, phase meter, and the reason for its phase.
- **Prototype and up:** the last commit date (absolute, so the build and the browser render the same text), GitHub
  stars and people committing.
- **Built and up:** a link to its CI runs.
- **Shipping and up:** what made it shipping (qq manifest, deploy config, daily canary).
- **In the daily canary:** the live tree status and canary commit, fetched in the browser from gardener's
  `tree-status` branch and release's `release-state` branch (see `components/QuirqInfraV0/live.ts`), and a link to
  `/v0`.

## Data

- `quirq.projects.json`: groups, descriptions, hidden repositories and hand-set phases.
- `src/data/quirq-projects.json`: the generated snapshot of files, star counts and committer counts (no names or
  emails). Refresh it with `pnpm projects:sync` (anonymous git and one anonymous API request, no token) and check it offline with
  `pnpm projects:check`. Both fail when a public repository is in no group and not hidden, so a new repo is never
  silently missing from the page.
- `src/lib/quirqProjects.ts`: typed access for the UI.

UI uses the shadcn primitives in `src/components/ui/`.
