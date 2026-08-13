import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import * as plugin from '../index.js'

function captureProvider() {
  let provider
  const ctx = {
    skills: {
      registerProvider(factory) {
        provider = factory()
      },
    },
  }
  plugin.apply(ctx)
  assert.ok(provider)
  return provider
}

test('exports one Loader-safe function plugin', () => {
  assert.equal(plugin.name, 'resume-foreign-session')
  assert.deepEqual(plugin.inject, ['skills'])
  assert.equal('default' in plugin, false)
  assert.equal(typeof plugin.apply, 'function')
})

test('registers and loads both bundled skills with package-local resources', async () => {
  const provider = captureProvider()
  const candidates = await provider.list()

  assert.equal(provider.name, 'resume-foreign-session')
  assert.deepEqual(candidates.map(candidate => candidate.name), [
    'resume-claude',
    'resume-codex',
  ])

  for (const candidate of candidates) {
    assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true })
    assert.equal(candidate.provider, provider.name)
    assert.equal(candidate.source, 'bundled')
    assert.equal(candidate.rank, 600)
    assert.equal(candidate.resourceBase.kind, 'directory')
    assert.equal(candidate.resourceBase.path, fileURLToPath(new URL('../skills/shared/resume-session/', import.meta.url)))
    await access(join(candidate.resourceBase.path, 'CORE.md'))
    await access(join(candidate.resourceBase.path, 'session_reader.py'))

    const definition = await provider.get(candidate)
    assert.equal(definition.name, candidate.name)
    assert.equal(definition.resourceBase, candidate.resourceBase)
    assert.match(definition.content, /Read `CORE\.md` from this skill's base directory/u)
    assert.match(definition.content, /continue in the current DeepSeek Harness session/u)
  }
})

test('does not load a forged candidate that only reuses a skill name', async () => {
  const provider = captureProvider()
  const [candidate] = await provider.list()
  assert.equal(await provider.get({ ...candidate }), undefined)
  assert.equal(await provider.get({ name: 'unknown' }), undefined)
})
