import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
    buildQuirqProjects,
    computePhase,
    countPeople,
    isNoteFile,
    readSignals,
    validateProjectsConfig,
} from './lib/quirq-phases.mjs'
import { syncQuirqProjects } from './sync-quirq-projects.mjs'

const phaseOf = (paths, extra = {}) => computePhase({ ...readSignals(paths), ...extra }).phase

test('notes and images do not count as code', () => {
    assert.ok(isNoteFile('README.md'))
    assert.ok(isNoteFile('docs/plan.MDX'))
    assert.ok(isNoteFile('LICENSE'))
    assert.ok(isNoteFile('art/logo.svg'))
    assert.ok(!isNoteFile('src/index.ts'))
    assert.ok(!isNoteFile('pyproject.toml'))
})

test('phases climb with the repo shape', () => {
    assert.equal(phaseOf([]), 'thought')
    assert.equal(phaseOf(['README.md', 'LICENSE', 'notes/idea.md']), 'thought')
    assert.equal(phaseOf(['README.md', '.github/CODEOWNERS', '.github/workflows/ci.yml']), 'thought')
    assert.equal(phaseOf(['README.md', 'src/main.py']), 'prototype')
    assert.equal(phaseOf(['src/main.py', '.github/workflows/ci.yml']), 'built')
    assert.equal(phaseOf(['src/main.py', '.github/workflows/ci.yml', 'infra/repo.toml']), 'shipping')
    assert.equal(phaseOf(['src/main.py', '.github/workflows/ci.yml', 'vercel.json']), 'shipping')
    assert.equal(phaseOf(['src/main.py', '.github/workflows/ci.yml'], { inCanary: true }), 'shipping')
    // Shipping signals without CI stay a prototype.
    assert.equal(phaseOf(['src/main.py', 'vercel.json']), 'prototype')
})

test('stars or people committing make a project with code a Project', () => {
    const code = readSignals(['src/main.py'])
    assert.equal(computePhase({ ...code, stars: 10 }).phase, 'project')
    assert.equal(computePhase({ ...code, people: 5 }).phase, 'project')
    assert.equal(computePhase({ ...code, stars: 9, people: 4 }).phase, 'prototype')
    assert.equal(computePhase({ ...code, stars: 26, people: 12 }).reason, '26 GitHub stars and 12 people committing.')
    assert.equal(
        computePhase({ ...code, stars: 1, people: 1 }, {}, { minStars: 1, minPeople: 9 }).reason,
        '1 GitHub star and 1 person committing.'
    )
    // Stars alone do not lift a notes-only repo.
    assert.equal(computePhase({ ...readSignals(['README.md']), stars: 50 }).phase, 'thought')
})

test('people are counted once across names and emails, without bots or agents', () => {
    const lines = [
        'Suraj Sharma|36091186+sharmasuraj0123@users.noreply.github.com',
        'sharmasuraj0123|sharmasuraj0123@gmail.com',
        'Suraj|sharmasuraj0123@gmail.com',
        'Rohini Pedamkar|138889836+rohini-sp@users.noreply.github.com',
        'rohini|138889836+rohini-sp@users.noreply.github.com',
        'Rohini @ XO|rohini@xo.builders',
        'XO|dev@xo.builders',
        'quirqy|dev@xo.builders',
        'Claude|noreply@anthropic.com',
        'quirq-gates|gates@quirq.ai',
        'Copilot|198982749+Copilot@users.noreply.github.com',
        'github-actions[bot]|41898699+github-actions[bot]@users.noreply.github.com',
        '',
    ]
    assert.equal(countPeople(lines), 3)
    assert.equal(countPeople(['A|a@example.com'], []), 1)
    assert.equal(countPeople(['Claude|noreply@anthropic.com'], []), 1)
})

test('only workflow files directly under .github/workflows count as CI', () => {
    const signals = readSignals([
        '.github/workflows/ci.yml',
        '.github/workflows/nested/x.yml',
        '.github/dependabot.yml',
    ])
    assert.equal(signals.workflows, 1)
    assert.equal(signals.codeFiles, 0)
})

test('reasons say what was found', () => {
    assert.equal(computePhase(readSignals(['a.py', 'b.py'])).reason, '2 code or config files, no CI yet.')
    assert.equal(
        computePhase(readSignals(['a.py', '.github/workflows/ci.yml'])).reason,
        '1 code or config file with 1 CI workflow.'
    )
    assert.equal(
        computePhase({ ...readSignals(['a.py', '.github/workflows/ci.yml', 'infra/repo.toml']), inCanary: true })
            .reason,
        'CI on GitHub, onboarded to qq, in the daily canary.'
    )
})

test('a phase set by hand needs a known phase and a reason', () => {
    const result = computePhase(readSignals([]), { phase: 'project', phaseReason: ' Has live users. ' })
    assert.deepEqual(result, { phase: 'project', reason: 'Has live users.', overridden: true })
    assert.throws(() => computePhase(readSignals([]), { phase: 'project' }), /phaseReason/)
    assert.throws(() => computePhase(readSignals([]), { phase: 'launched', phaseReason: 'x' }), /Unknown phase/)
})

test('config validation catches duplicates, strays and bad overrides', () => {
    const base = { organization: 'quirq-ai', groups: [{ name: 'A', repos: ['one'] }] }
    assert.doesNotThrow(() => validateProjectsConfig(base))
    assert.throws(() => validateProjectsConfig({ ...base, groups: [] }), /groups/)
    assert.throws(
        () =>
            validateProjectsConfig({
                ...base,
                groups: [
                    { name: 'A', repos: ['one'] },
                    { name: 'B', repos: ['one'] },
                ],
            }),
        /more than one group/
    )
    assert.throws(() => validateProjectsConfig({ ...base, repositories: { two: { description: 'x' } } }), /no group/)
    assert.doesNotThrow(() => validateProjectsConfig({ ...base, repositories: { two: { hidden: true } } }))
    assert.throws(() => validateProjectsConfig({ ...base, repositories: { one: { phase: 'project' } } }), /phaseReason/)
    assert.throws(() => validateProjectsConfig({ ...base, projectRule: { minStars: 0 } }), /minStars/)
    assert.throws(() => validateProjectsConfig({ ...base, automation: 'bots' }), /automation/)
})

test('buildQuirqProjects groups repos, hides hidden ones and flags missing ones', () => {
    const config = {
        organization: 'quirq-ai',
        groups: [{ name: 'A', description: 'Group A', repos: ['one', 'two', 'gone'] }],
        repositories: { two: { hidden: true }, one: { description: 'The first.' } },
    }
    const snapshot = {
        repositories: [
            { name: 'one', sha: 'abc', committedAt: '2026-10-05T00:00:00Z', ...readSignals(['x.py']), inCanary: false },
        ],
    }
    const [group] = buildQuirqProjects(snapshot, config)
    assert.equal(group.description, 'Group A')
    assert.deepEqual(
        group.projects.map((project) => [project.name, project.phase, project.missing]),
        [
            ['one', 'prototype', false],
            ['gone', 'thought', true],
        ]
    )
    assert.equal(group.projects[0].description, 'The first.')
    assert.equal(group.projects[0].url, 'https://github.com/quirq-ai/one')
})

test('sync writes the snapshot with canary membership, and check reads it offline', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'quirq-phases-test-'))
    try {
        const configPath = join(directory, 'quirq.projects.json')
        const outputPath = join(directory, 'quirq-projects.json')
        await writeFile(
            configPath,
            JSON.stringify({ organization: 'quirq-ai', groups: [{ name: 'A', repos: ['one', 'two'] }] })
        )
        const probe = async (organization, name) => ({
            name,
            sha: `${name}-sha`,
            committedAt: '2026-10-05T00:00:00Z',
            ...readSignals(name === 'one' ? ['a.py', '.github/workflows/ci.yml'] : ['README.md']),
        })
        const fetchImpl = async (url) =>
            url.endsWith('channels.json')
                ? { ok: true, json: async () => ({ repos: { one: { canary: { commit: 'c' } } } }) }
                : { ok: true, json: async () => [{ name: 'two', stargazers_count: 12 }] }
        const { groups, written } = await syncQuirqProjects({ configPath, outputPath, probe, fetchImpl })
        assert.ok(written)
        assert.deepEqual(
            groups[0].projects.map((project) => [project.name, project.phase]),
            [
                ['one', 'shipping'],
                ['two', 'thought'],
            ]
        )
        assert.equal(groups[0].projects[1].signals.stars, 12)
        const saved = JSON.parse(await readFile(outputPath, 'utf8'))
        assert.equal(saved.repositories.find((repo) => repo.name === 'one').inCanary, true)
        const checked = await syncQuirqProjects({ configPath, outputPath, check: true })
        assert.equal(checked.written, false)

        // When the API is unavailable, stars come from the apps snapshot.
        const appsSnapshotPath = join(directory, 'apps.json')
        await writeFile(
            appsSnapshotPath,
            JSON.stringify({ fetchedAt: 'then', repositories: [{ name: 'one', stargazers_count: 4 }] })
        )
        const offline = async (url) =>
            url.endsWith('channels.json') ? fetchImpl(url) : { ok: false, status: 403, json: async () => ({}) }
        const fallback = await syncQuirqProjects({
            configPath,
            outputPath,
            appsSnapshotPath,
            probe,
            fetchImpl: offline,
        })
        assert.equal(fallback.snapshot.starsSource, 'apps-snapshot then')
        assert.equal(fallback.groups[0].projects[0].signals.stars, 4)

        await writeFile(
            configPath,
            JSON.stringify({ organization: 'quirq-ai', groups: [{ name: 'A', repos: ['one', 'three'] }] })
        )
        await assert.rejects(syncQuirqProjects({ configPath, outputPath, check: true }), /three.*projects:sync/)
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
})
