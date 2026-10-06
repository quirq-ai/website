// What quirq infra (qq) v0 is, as of 2026-10-05. The repo roles, the walk-through of one change and the
// Chromium counterparts are adapted from the infra-map app in quirq-ai/research (MIT,
// infra/output/app/infra-map/src/repos.ts). Status lines come from the v0 status report in the same repo
// (infra/output/report/2026-10-05-qq-v0-status.md). The live tab reads current state instead.

export const ORG = 'https://github.com/quirq-ai'
export const AS_OF = '5 October 2026'

export const SOURCES = {
    plan: `${ORG}/infra-config/blob/main/docs/v0.md`,
    status: `${ORG}/research/blob/main/infra/output/report/2026-10-05-qq-v0-status.md`,
    map: `${ORG}/research/tree/main/infra/output/app/infra-map`,
    treeStatus: `${ORG}/gardener/tree/tree-status/status`,
    releaseState: `${ORG}/release/tree/release-state`,
}

export const PRODUCTS = ['xo-space', 'innernet'] as const
export type Product = (typeof PRODUCTS)[number]

export const LANES = ['Your machine', 'Before landing', 'After landing', 'Shipping'] as const

export type InfraRepo = {
    name: string
    lane: number
    sub: string
    role: string
    counterpart: string
    open: string
}

export const REPOS: InfraRepo[] = [
    {
        name: 'depot',
        lane: 0,
        sub: 'the qq command',
        role: 'The qq command line you run: fetch, sync, build, test, upload, try, land, status. Each onboarded product repo pins the qq version it uses.',
        counterpart: 'depot_tools',
        open: "No versioned qq release can be cut until the release executor App, which exists, is wired into release and allowed to write depot's tags.",
    },
    {
        name: 'sync',
        lane: 0,
        sub: 'manifest and parser',
        role: 'Defines infra/repo.toml, the manifest each product repo keeps, and is the only code allowed to read or edit it.',
        counterpart: 'gclient and DEPS',
        open: 'Nothing for v0.',
    },
    {
        name: 'recipes',
        lane: 0,
        sub: 'adapters per kind',
        role: 'Adapters for each kind of repo (a Python service, a Next.js app) that plan and run fetch, build, test and bench.',
        counterpart: 'recipes',
        open: 'The generated CI builders do not call it yet.',
    },
    {
        name: 'toolchains',
        lane: 0,
        sub: 'pinned Python and Node',
        role: 'Builds Python, Node and pnpm, publishes them pinned by digest, and promotes a new build only through a reviewed PR. Linux x86_64 only so far.',
        counterpart: 'CIPD toolchain packages',
        open: 'Its promotion gate becomes a required check with the next settings run.',
    },
    {
        name: 'remote-build',
        lane: 0,
        sub: 'executor and cache',
        role: 'Runs one build action on your machine or on a runner, with a cache keyed by the action.',
        counterpart: 'goma and RBE',
        open: 'qq does not call it yet.',
    },
    {
        name: 'infra-config',
        lane: 1,
        sub: 'policy as code',
        role: 'All policy in one place: required checks, revert caps, roll schedules, channels. It generates each product repo’s CI workflows.',
        counterpart: 'the infra/config repo',
        open: 'A few values and owners wait on suraj.',
    },
    {
        name: 'gate',
        lane: 1,
        sub: 'what must pass',
        role: 'Works out the required checks from infra-config and the manifest, guards that no core repo names a language, and applies repo settings.',
        counterpart: 'LUCI CV',
        open: 'The owner-review rule waits on owners being named.',
    },
    {
        name: 'test-pipelines',
        lane: 1,
        sub: 'results and verdicts',
        role: 'Stores every test result, files failure records and builds the scorecard.',
        counterpart: 'ResultDB and LUCI Analysis',
        open: 'Retry-then-compare-with-base is built but not switched on for the product repos.',
    },
    {
        name: 'gardener',
        lane: 2,
        sub: 'keeps main green',
        role: 'Watches every main commit, publishes tree status, groups failures, bisects to the culprit. Once its App exists it will propose reverts, at most 10 in any 24 hours.',
        counterpart: 'Sheriff-o-Matic and LUCI Bisection',
        open: 'Opening revert PRs needs its own GitHub App, which does not exist yet.',
    },
    {
        name: 'rollers',
        lane: 2,
        sub: 'moves pins forward',
        role: 'Configures Dependabot for lockfiles and runs the toolchain-pin roller. Roll PRs pass the same gate as yours.',
        counterpart: 'AutoRoll',
        open: 'Auto-land is off, so a person merges every roll.',
    },
    {
        name: 'perf',
        lane: 2,
        sub: 'benchmarks and size',
        role: 'Records one benchmark per product repo, plus innernet’s build size, for each commit that lands on main.',
        counterpart: 'the perf dashboard',
        open: 'Nothing for v0.',
    },
    {
        name: 'release',
        lane: 3,
        sub: 'lkgr and channels',
        role: 'Tracks lkgr, the newest all-green main commit, and the channel pointers with rollback. Canary is the only channel v0 promotes, once a day.',
        counterpart: 'lkgr and release channels',
        open: 'The unattended 7-day canary streak, and wiring in the release executor App, which exists.',
    },
    {
        name: 'installer',
        lane: 3,
        sub: 'follows channels',
        role: 'Reads which commit and digest each channel names, so test installs can follow it.',
        counterpart: 'Omaha',
        open: 'Canary test machines are not set up yet.',
    },
]

export type FlowStep = { title: string; text: string; repos: string[] }

export const FLOW: FlowStep[] = [
    {
        title: 'You sync',
        text: 'qq sync reads the repo’s infra/repo.toml and downloads each pinned toolchain, checked against its digest. Toolchains are Linux x86_64 only so far; on a Mac you bring your own.',
        repos: ['depot', 'sync', 'toolchains'],
    },
    {
        title: 'You build and test',
        text: 'qq build and qq test hand the manifest to recipes, which plans and runs each build and test action. remote-build, the shared action cache, is built but qq does not call it yet.',
        repos: ['depot', 'recipes'],
    },
    {
        title: 'You open a PR',
        text: 'qq try pushes your branch, opens the PR and returns at once with a run ID. The verdict is reported later, so an agent never waits on a tool call.',
        repos: ['depot'],
    },
    {
        title: 'The gate decides what must pass',
        text: 'gate reads the required checks from infra-config and the repo’s manifest. The workflows that run them were generated by infra-config.',
        repos: ['gate', 'infra-config', 'sync'],
    },
    {
        title: 'Results become a verdict',
        text: 'Every JUnit result goes to test-pipelines. Today one failing test fails the required check; retrying and comparing with base is built but not on yet.',
        repos: ['test-pipelines'],
    },
    {
        title: 'You land',
        text: 'qq land waits for a pass, then joins GitHub’s merge queue, which tests your change on top of the ones ahead and squash-merges it into main.',
        repos: ['depot', 'gate'],
    },
    {
        title: 'main stays green',
        text: 'Post-submit runs on every main commit. gardener watches those runs and publishes tree status; once its App exists it proposes a revert for a break. perf records benchmarks.',
        repos: ['gardener', 'test-pipelines', 'perf'],
    },
    {
        title: 'Pins move forward',
        text: 'When toolchains promotes a new build, rollers edits the pin through sync and opens a PR that goes through the same gate as yours.',
        repos: ['rollers', 'toolchains', 'sync'],
    },
    {
        title: 'Shipping',
        text: 'release moves lkgr to the newest all-green commit. Once a day it builds that commit, runs the full tests, starts it and probes it; only then does the canary pointer move. installer can resolve a channel; canary test machines are not set up yet.',
        repos: ['release', 'installer'],
    },
]

export type ExitCheck = { title: string; state: 'done' | 'progress' | 'todo'; status: string }

export const EXIT_TEST: ExitCheck[] = [
    {
        title: 'All 13 repos are public, each with CODEOWNERS, a generated presubmit and a merge queue',
        state: 'progress',
        status: 'The repos are public and their rulesets are applied. Some owners are still to be named.',
    },
    {
        title: 'xo-space and innernet are gated from their manifests through shared adapters, and a red PR is refused',
        state: 'progress',
        status: 'Both are gated from generated workflows. The builders still run interim commands instead of recipes, and the red-PR check has not been run yet.',
    },
    {
        title: 'A daily canary runs 7 days in a row with no human touch, and a bad canary is held and rolled back',
        state: 'progress',
        status: 'The first canary shipped both repos on 5 October, started by hand. The unattended streak has not started. No held canary or rollback drill yet. The live tab shows the last 7 days.',
    },
    {
        title: 'A build-breaking commit is reverted automatically, with a record linking culprit and fix',
        state: 'todo',
        status: 'gardener finds culprits, but opening revert PRs needs its GitHub App, which does not exist yet.',
    },
    {
        title: 'Scorecard v0 is computed by a script, not typed',
        state: 'progress',
        status: 'The scorecard is built in test-pipelines.',
    },
]

export type GuideSection = { title: string; steps: { text: string; code?: string; note?: string }[] }

export const GUIDE: GuideSection[] = [
    {
        title: 'Land a change',
        steps: [
            {
                text: 'Put depot’s bin on your PATH once. Inside a product repo, qq runs the version that repo pins.',
                code: 'git clone https://github.com/quirq-ai/depot\nexport PATH="$PWD/depot/bin:$PATH"',
            },
            {
                text: 'Fetch the pinned toolchains, checked against their digests.',
                code: 'qq sync',
                note: 'Linux x86_64 only for now. On a Mac, qq sync stops at the toolchain step and you use your own.',
            },
            { text: 'Build and test the way CI does.', code: 'qq build\nqq test' },
            {
                text: 'Open a PR and get a run ID back at once. The verdict arrives later.',
                code: 'qq try',
            },
            {
                text: 'Check the verdict whenever you like. Exit 0 is a pass, 1 refused, 3 still pending.',
                code: 'qq status',
            },
            {
                text: 'Land it. The merge queue re-runs the check on the exact merge result and squash-merges.',
                code: 'qq land',
                note: 'On xo-space, use Merge when ready on GitHub instead.',
            },
        ],
    },
    {
        title: 'When the tree is closed',
        steps: [
            {
                text: 'A closed tree means the newest post-submit run on main is red. The live tab shows which builder and commit.',
            },
            {
                text: 'gardener groups the failure and bisects it to a culprit. Today a person opens and merges the revert; gardener will propose it itself once its App exists, at most 10 reverts in any 24 hours.',
            },
            { text: 'Land fixes, not new features, until the tree is open again.' },
        ],
    },
    {
        title: 'How shipping works',
        steps: [
            {
                text: 'lkgr is the newest main commit whose post-submit builders are all green. release moves it on a schedule.',
            },
            {
                text: 'Once a day the canary takes lkgr through build, verify, fuzz smoke, deploy and probe. Only if every stage passes does the canary pointer in release-state move.',
            },
            {
                text: 'A canary that fails a stage is held and gets a failure record. release can roll the channel back to the previous canary (qq channel rollback). A presubmit drill does it against fixtures in under 10 minutes; the live drill is still to come.',
            },
            {
                text: 'Test installs follow a channel rather than main. There are no canary test machines yet.',
                code: 'qqinstall resolve --repo xo-space --channel canary',
            },
        ],
    },
]

export const LIMITS = [
    'Toolchains are Linux x86_64 only, so qq sync stops on a Mac.',
    'One failing test fails the required check; retry-then-compare is not on yet.',
    'Auto-land is off: a person merges every roll and revert.',
    'Reverts wait on gardener’s GitHub App.',
    'release records each canary in release-state, but the product repos’ channels/canary git refs wait until the release executor App, which exists, is wired into release, so the promote stage reports “skipped”.',
    'There are no canary test machines yet; installer can resolve a channel, but nothing installs from it daily.',
    'The CI builders still run interim commands instead of recipes and the promoted toolchain pins.',
    'GitHub can skip or delay scheduled runs on quiet repos, so a daily backstop starts the canary if it was missed.',
]
