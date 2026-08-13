# Resume a Codex session

Use this workflow when the user wants to continue work recorded by Codex CLI or the Codex VS Code extension.

The optional session reference is the text accompanying this skill invocation. It may be `latest`, a native UUID, a rollout path, or words from the session title. When the user supplies no reference, use `latest`.

Resolve `../shared/resume-session/CORE.md` against this skill's base directory shown in `<skill_resources>`. Read it completely and follow it with:

- tool: `codex`
- reference: the optional session reference, unchanged

Do not start Codex or delegate the resumed work back to Codex. The goal is to construct a safe handoff and continue in the current DeepSeek Harness session.
