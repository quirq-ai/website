import test from 'node:test'
import assert from 'node:assert/strict'
import { quirqRoles, roleInfo, roleKeywords } from './quirqRoles.ts'

test('every type the catalog knows has a name, a plural and a meaning', () => {
    assert.deepEqual(Object.keys(roleInfo).sort(), [...quirqRoles].sort())
    for (const role of quirqRoles) {
        const { label, plural, meaning } = roleInfo[role]
        assert.ok(label && plural && meaning.endsWith('.'), role)
    }
})

test('search finds a type by its value, its name or its plural', () => {
    assert.equal(roleKeywords(null), '')
    assert.match(roleKeywords('library'), /\blibrary\b/)
    assert.match(roleKeywords('library'), /\blibraries\b/)
    assert.match(roleKeywords('tool'), /\btools\b/)
})
