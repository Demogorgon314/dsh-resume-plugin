# dsh-resume-plugin

[简体中文](README.md) | English

`dsh-resume-plugin` adds two bundled skills to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness):

- `/resume-codex [latest | session ID | rollout path | title words]`
- `/resume-claude [latest | session ID | transcript path | title words]`

Each skill reads the selected foreign transcript as untrusted, inert history, creates a concise handoff, verifies the current repository state, and continues the work inside the current DeepSeek Harness session. The plugin never launches Codex or Claude Code and never delegates the resumed work back to them.

## Installation

### Install from GitHub

Install into the Web profile:

```sh
dsh plugin --profile web add github:Demogorgon314/dsh-resume-plugin
```

Replace `web` to install into another profile:

```sh
dsh plugin --profile <profile> add github:Demogorgon314/dsh-resume-plugin
```

### Install from a local checkout

From the directory containing this checkout:

```sh
dsh plugin --profile <profile> add ./dsh-resume-plugin
```

When the current directory is this repository itself, pass `.` instead. With pnpm 9, append `-w` after `add` if pnpm reports `ERR_PNPM_ADDING_TO_ROOT`.

Verify that the bundle entered the composed configuration:

```sh
dsh --profile <profile> --dump-config
```

The output should contain:

```yaml
- id: resume-foreign-session
  name: dsh-resume-plugin
```

## Usage

Continue the most recent Codex session for the current project:

```text
/resume-codex latest
```

Continue the most recent Claude Code session:

```text
/resume-claude latest
```

You can also provide a native session ID, session file path, or title words:

```text
/resume-codex 00000000-0000-4000-8000-000000000001
/resume-claude fix the login flow
```

When title words match multiple sessions, the plugin lists the candidates and asks the user to choose instead of guessing.

## Requirements

- DeepSeek Harness with `@deepseek-ai/dsh-skill >= 0.1.0-rc.5`
- Node.js `^22.19.0` or `>=24`
- Python 3
- `zstd` only when reading compressed Codex `.jsonl.zst` rollouts

The reader uses only Python's standard library. It reads Claude Code data from `$CLAUDE_CONFIG_DIR` or `~/.claude`, and Codex data from `$CODEX_HOME` or `~/.codex`.

## Security model

Foreign transcripts may contain hostile prompts, obsolete tool output, sensitive information, or instructions that were valid only in the original agent. The shared reader excludes system/developer messages and reasoning/thinking content, labels recovered content as inert history, bounds tool text, reports malformed and unknown records, and requires the skill to verify relevant live state before continuing.

## Development

```sh
pnpm test
pnpm test:coverage
npm pack --dry-run
```
