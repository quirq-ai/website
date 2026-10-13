import test from 'node:test'
import assert from 'node:assert/strict'
import { projectGroupsOnly } from './quirqProjectFilter.ts'

const group = (name: string, ...repos: string[]) => ({ name, projects: repos.map((repo) => ({ name: repo })) })
const names = (groups: { name: string; projects: { name: string }[] }[]) =>
    groups.map((item) => `${item.name}: ${item.projects.map((project) => project.name).join(' ')}`)

test('only project repositories stay, and a group left empty is dropped', () => {
    const groups = [group('Products', 'xo-space', 'innernet'), group('qq infra', 'gate', 'sync')]
    const repositories = [
        { name: 'xo-space', role: 'project', archived: false },
        { name: 'innernet', role: 'project', archived: false },
        { name: 'gate', role: 'tool', archived: false },
        { name: 'sync', role: 'library', archived: false },
    ]
    assert.deepEqual(names(projectGroupsOnly(groups, repositories)), ['Products: xo-space innernet'])
})

test('a repository with no type shown counts as a project, the default', () => {
    const repositories = [{ name: 'euler', role: null, archived: false }]
    assert.deepEqual(names(projectGroupsOnly([group('Apps', 'euler')], repositories)), ['Apps: euler'])
})

test('a type this site does not know, an archived repository or a missing one is not a project', () => {
    const groups = [group('qq infra', 'perf', 'gate', 'vangogh')]
    const repositories = [
        { name: 'perf', role: 'service', archived: false },
        { name: 'gate', role: 'project', archived: true },
    ]
    assert.deepEqual(projectGroupsOnly(groups, repositories), [])
})

test('names match whatever their case', () => {
    const groups = [group('Apps', 'euler', 'galileo')]
    const repositories = [
        { name: 'Euler', role: 'tool', archived: false },
        { name: 'GALILEO', role: 'project', archived: false },
    ]
    assert.deepEqual(names(projectGroupsOnly(groups, repositories)), ['Apps: galileo'])
})

test('groups keep their order and their other fields', () => {
    const groups = [
        { ...group('Products', 'website'), description: 'What people use.' },
        { ...group('Other', 'monitoring'), description: 'Plans.' },
    ]
    const repositories = [
        { name: 'monitoring', role: 'project', archived: false },
        { name: 'website', role: 'project', archived: false },
    ]
    const kept = projectGroupsOnly(groups, repositories)
    assert.deepEqual(
        kept.map((item) => [item.name, item.description]),
        [
            ['Products', 'What people use.'],
            ['Other', 'Plans.'],
        ]
    )
})
