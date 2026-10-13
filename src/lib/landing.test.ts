import test from 'node:test'
import assert from 'node:assert/strict'
import { isLandingPath, startsOnDesktop } from './landing.ts'

test('only the home page is the landing page', () => {
    assert.equal(isLandingPath('/'), true)
    assert.equal(isLandingPath(''), true)
    assert.equal(isLandingPath('//'), true)
    for (const path of ['/projects', '/projects/', '/xo-space', '/apps/gate', '/launch/docs', '/v0', '/404.html']) {
        assert.equal(isLandingPath(path), false, path)
    }
})

test('a visit to / starts on the desktop; deep links, shared windows and frames do not', () => {
    assert.equal(startsOnDesktop({ pathname: '/', framed: false, sharedWindows: false }), true)
    assert.equal(startsOnDesktop({ pathname: '/projects', framed: false, sharedWindows: false }), false)
    assert.equal(startsOnDesktop({ pathname: '/', framed: false, sharedWindows: true }), false)
    assert.equal(startsOnDesktop({ pathname: '/', framed: true, sharedWindows: false }), false)
})
