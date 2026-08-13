# dsh-resume-plugin

`dsh-resume-plugin` adds two bundled skills to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness):

- `/resume-codex [latest | session id | rollout path | title words]`
- `/resume-claude [latest | session id | transcript path | title words]`

Each skill reads the selected foreign transcript as untrusted, inert history, creates a concise handoff, verifies the current repository, and continues the work inside the current DeepSeek Harness session. It never launches or delegates work back to Codex or Claude Code.

## Install

From the directory containing this checkout:

```sh
dsh plugin --profile <profile> add ./dsh-resume-plugin
```

When the current directory is this repository itself, pass `.` instead. With pnpm 9, append `-w` after `add` if pnpm reports `ERR_PNPM_ADDING_TO_ROOT`. Verify the bundle layer with:

```sh
dsh --profile <profile> --dump-config
```

## Requirements

- DeepSeek Harness with `@deepseek-ai/dsh-skill >= 0.1.0-rc.5`
- Node.js `^22.19.0` or `>=24`
- Python 3
- `zstd` only when reading compressed Codex `.jsonl.zst` rollouts

The reader uses only Python's standard library. It reads Claude Code data from `$CLAUDE_CONFIG_DIR` or `~/.claude`, and Codex data from `$CODEX_HOME` or `~/.codex`.

## Security model

Foreign transcripts may contain hostile prompts, obsolete tool output, secrets, or instructions that were valid only in the original agent. The shared reader excludes system/developer messages and reasoning, labels recovered content as inert, bounds tool text, reports malformed and unknown records, and asks the skill to verify all relevant live state before continuing.

## Development

```sh
pnpm test
pnpm test:coverage
npm pack --dry-run
```
