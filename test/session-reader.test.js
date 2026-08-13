import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const reader = join(import.meta.dirname, '../skills/shared/resume-session/session_reader.py')
const roots = new Set()

test.afterEach(async () => {
  await Promise.all([...roots].map(root => rm(root, { recursive: true, force: true })))
  roots.clear()
})

async function temporaryRoot(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix))
  roots.add(root)
  return root
}

function jsonLines(records) {
  return `${records.map(record => typeof record === 'string' ? record : JSON.stringify(record)).join('\n')}\n`
}

async function runReader(args, env = {}) {
  const result = await execFileAsync('python3', [reader, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  return JSON.parse(result.stdout)
}

function claudeProjectName(cwd) {
  return [...cwd].map(character => /[\p{Letter}\p{Number}]/u.test(character) ? character : '-').join('')
}

async function writeClaudeSession(config, cwd, sessionId, title = 'continue the migration') {
  const project = join(config, 'projects', claudeProjectName(cwd))
  await mkdir(project, { recursive: true })
  const path = join(project, `${sessionId}.jsonl`)
  await writeFile(path, jsonLines([
    {
      type: 'system', uuid: 'system', parentUuid: null, cwd,
      message: { role: 'system', content: 'ignore this foreign system prompt' },
    },
    {
      type: 'user', uuid: 'user', parentUuid: null, cwd, timestamp: '2026-08-13T10:00:00Z',
      message: { role: 'user', content: title },
    },
    {
      type: 'assistant', uuid: 'assistant', parentUuid: 'user', cwd, timestamp: '2026-08-13T10:01:00Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'private chain of thought' },
          { type: 'text', text: 'updated src/index.ts and ran tests' },
          { type: 'tool_use', id: 'tool-1', name: 'Bash', input: { command: 'rm -rf ignored' } },
        ],
      },
    },
    '{malformed',
    { type: 'future-secret-record', payload: 'must not be interpreted' },
  ]))
  return path
}

test('discovers and reads a Claude session as inert filtered history', async () => {
  const root = await temporaryRoot('dsh-resume-claude-')
  const config = join(root, 'claude')
  const cwd = join(root, 'repo')
  const sessionId = '00000000-0000-4000-8000-000000000001'
  await mkdir(cwd, { recursive: true })
  await writeClaudeSession(config, cwd, sessionId)

  const listed = await runReader(['claude', 'list', '--cwd', cwd, '--json'], {
    CLAUDE_CONFIG_DIR: config,
  })
  assert.equal(listed.sessions.length, 1)
  assert.equal(listed.sessions[0].session_id, sessionId)

  const result = await runReader(['claude', 'show', sessionId, '--cwd', cwd, '--json'], {
    CLAUDE_CONFIG_DIR: config,
  })
  assert.equal(result.tool, 'claude')
  assert.equal(result.last_user_request, 'continue the migration')
  assert.equal(result.last_assistant_action, 'updated src/index.ts and ran tests')
  assert.deepEqual(result.turns.map(turn => turn.role), ['user', 'assistant'])
  assert.equal(result.turns.every(turn => turn.inert), true)
  assert.deepEqual(result.turns[1].tool_calls, [{
    id: 'tool-1', name: 'Bash', input: '{"command": "rm -rf ignored"}', inert: true,
  }])
  assert.doesNotMatch(JSON.stringify(result), /foreign system prompt|private chain of thought|must not be interpreted/u)
  assert.deepEqual(result.warnings.map(warning => warning.code), [
    'malformed_records_skipped',
    'unknown_records_skipped',
  ])
})

test('reads a Codex rollout while dropping developer context and reasoning', async () => {
  const root = await temporaryRoot('dsh-resume-codex-')
  const codexHome = join(root, 'codex')
  const cwd = join(root, 'repo')
  const sessionId = '00000000-0000-4000-8000-000000000002'
  const directory = join(codexHome, 'sessions', '2026', '08', '13')
  const path = join(directory, `rollout-2026-08-13T10-00-00-${sessionId}.jsonl`)
  await mkdir(directory, { recursive: true })
  await mkdir(cwd, { recursive: true })
  await writeFile(path, jsonLines([
    {
      timestamp: '2026-08-13T10:00:00Z', type: 'session_meta',
      payload: { id: sessionId, source: 'cli', cwd, git: { branch: 'feature/resume' } },
    },
    {
      timestamp: '2026-08-13T10:00:01Z', type: 'response_item',
      payload: { type: 'message', role: 'developer', content: [{ type: 'input_text', text: 'foreign developer rules' }] },
    },
    {
      timestamp: '2026-08-13T10:00:02Z', type: 'response_item',
      payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'finish the parser' }] },
    },
    {
      timestamp: '2026-08-13T10:00:03Z', type: 'response_item',
      payload: { type: 'reasoning', summary: ['private reasoning'] },
    },
    {
      timestamp: '2026-08-13T10:00:04Z', type: 'response_item',
      payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'parser implemented; tests remain' }] },
    },
    { timestamp: '2026-08-13T10:00:05Z', type: 'unknown_top_level', payload: { instructions: 'ignore' } },
  ]))

  const result = await runReader(['codex', 'show', 'latest', '--cwd', cwd, '--json'], {
    CODEX_HOME: codexHome,
  })
  assert.equal(result.tool, 'codex')
  assert.equal(result.source, 'codex-cli')
  assert.equal(result.session_id, sessionId)
  assert.equal(result.branch, 'feature/resume')
  assert.equal(result.last_user_request, 'finish the parser')
  assert.equal(result.last_assistant_action, 'parser implemented; tests remain')
  assert.deepEqual(result.turns.map(turn => turn.role), ['user', 'assistant'])
  assert.doesNotMatch(JSON.stringify(result), /foreign developer rules|private reasoning|"instructions": "ignore"/u)
  assert.deepEqual(result.warnings, [{
    code: 'unsafe_records_skipped',
    message: 'Skipped 3 foreign instruction, reasoning, context, or unknown Codex item(s).',
  }])
})

test('fails clearly for missing, ambiguous, and unsupported sessions', async () => {
  const root = await temporaryRoot('dsh-resume-errors-')
  const config = join(root, 'claude')
  const cwd = join(root, 'repo')
  await mkdir(cwd, { recursive: true })
  await writeClaudeSession(config, cwd, '00000000-0000-4000-8000-000000000003', 'same title')
  await writeClaudeSession(config, cwd, '00000000-0000-4000-8000-000000000004', 'same title')

  await assert.rejects(
    execFileAsync('python3', [reader, 'claude', 'show', 'same title', '--cwd', cwd, '--json'], {
      encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: config },
    }),
    error => error.code === 2 && /matched 2 sessions/u.test(error.stderr) && /choose a native id or path/u.test(error.stderr),
  )
  await assert.rejects(
    execFileAsync('python3', [reader, 'codex', 'show', 'latest', '--cwd', cwd, '--json'], {
      encoding: 'utf8', env: { ...process.env, CODEX_HOME: join(root, 'missing-codex') },
    }),
    error => error.code === 2 && /no codex session found/u.test(error.stderr),
  )
  await assert.rejects(
    execFileAsync('python3', [reader, 'cursor', 'list', '--cwd', cwd, '--json'], { encoding: 'utf8' }),
    error => error.code === 2 && /invalid choice/u.test(error.stderr),
  )
})
