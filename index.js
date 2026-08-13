/**
 * Bundled foreign-session resume skills for DeepSeek Harness.
 * @module dsh-resume-plugin
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const PROVIDER_NAME = 'resume-foreign-session'
const BUNDLED_SKILL_RANK = 600
const INVOCATION = Object.freeze({ modelInvocable: true, userInvocable: true })

const specifications = Object.freeze([
  Object.freeze({
    name: 'resume-claude',
    description: 'Resume or continue work from a recent Claude Code session. Use when the user switched from Claude Code, asks to continue or resume a Claude session, or identifies one by description, path, or native ID.',
  }),
  Object.freeze({
    name: 'resume-codex',
    description: 'Resume or continue work from a recent Codex CLI or Codex VS Code session. Use when the user switched from Codex, asks to continue or resume a Codex session, or identifies one by description, path, or native ID.',
  }),
])

const candidates = specifications.map((specification) => {
  const directoryUrl = new URL(`./skills/${specification.name}/`, import.meta.url)
  return Object.freeze({
    ...specification,
    invocation: INVOCATION,
    provider: PROVIDER_NAME,
    source: 'bundled',
    resourceBase: Object.freeze({ kind: 'directory', path: fileURLToPath(directoryUrl) }),
    rank: BUNDLED_SKILL_RANK,
    locator: new URL('SKILL.md', directoryUrl),
  })
})

const candidatesByName = new Map(candidates.map(candidate => [candidate.name, candidate]))

const provider = Object.freeze({
  name: PROVIDER_NAME,
  list: () => Promise.resolve(candidates),
  async get(candidate) {
    const owned = candidatesByName.get(candidate.name)
    if (owned !== candidate) return undefined
    return {
      name: owned.name,
      description: owned.description,
      invocation: owned.invocation,
      provider: owned.provider,
      source: owned.source,
      resourceBase: owned.resourceBase,
      content: await readFile(owned.locator, 'utf8'),
    }
  },
})

/** Cordis plugin name. */
export const name = 'resume-foreign-session'

/** Service required by the bundled skill provider. */
export const inject = ['skills']

/**
 * Register the resume skills on the current skill registry.
 * @param {import('@deepseek-ai/cordis').Context} ctx Cordis context carrying the skill registry.
 * @returns {void}
 */
export function apply(ctx) {
  ctx.skills.registerProvider(() => provider)
}
