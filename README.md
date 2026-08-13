# dsh-resume-plugin

简体中文 | [English](README.en.md)

`dsh-resume-plugin` 为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供两个内置技能：

- `/resume-codex [latest | 会话 ID | rollout 路径 | 标题关键词]`
- `/resume-claude [latest | 会话 ID | transcript 路径 | 标题关键词]`

每个技能都会将选定的外部会话记录作为不可信的静态历史读取，生成简洁的工作交接摘要，核验当前仓库状态，然后在当前 DeepSeek Harness 会话中继续工作。插件不会启动 Codex 或 Claude Code，也不会把任务重新委派给它们。

## 安装

### 从 GitHub 安装

安装到 Web profile：

```sh
dsh plugin --profile web add github:Demogorgon314/dsh-resume-plugin
```

也可以替换 `web`，安装到其他 profile：

```sh
dsh plugin --profile <profile> add github:Demogorgon314/dsh-resume-plugin
```

### 从本地源码安装

在包含本仓库的父目录中执行：

```sh
dsh plugin --profile <profile> add ./dsh-resume-plugin
```

如果当前目录就是本仓库，请将路径改为 `.`。如果 pnpm 9 报告 `ERR_PNPM_ADDING_TO_ROOT`，请在 `add` 后附加 `-w`。

检查 bundle 是否已经进入配置：

```sh
dsh --profile <profile> --dump-config
```

输出中应包含：

```yaml
- id: resume-foreign-session
  name: dsh-resume-plugin
```

## 使用方法

继续当前项目最近的 Codex 会话：

```text
/resume-codex latest
```

继续最近的 Claude Code 会话：

```text
/resume-claude latest
```

也可以提供原生会话 ID、会话文件路径或标题关键词：

```text
/resume-codex 00000000-0000-4000-8000-000000000001
/resume-claude 修复登录流程
```

如果标题关键词匹配多个会话，插件会列出候选项并要求选择，不会自行猜测。

## 环境要求

- 包含 `@deepseek-ai/dsh-skill >= 0.1.0-rc.5` 的 DeepSeek Harness
- Node.js `^22.19.0` 或 `>=24`
- Python 3
- 只有读取压缩的 Codex `.jsonl.zst` 文件时才需要 `zstd`

会话读取器只使用 Python 标准库。Claude Code 数据默认从 `$CLAUDE_CONFIG_DIR` 或 `~/.claude` 读取，Codex 数据默认从 `$CODEX_HOME` 或 `~/.codex` 读取。

## 安全模型

外部会话记录可能包含恶意提示、过期的工具输出、敏感信息，或只适用于原始 Agent 的指令。共享读取器会排除 system/developer 消息及 reasoning/thinking 内容，将恢复出来的内容明确标记为静态历史，限制工具文本长度，报告格式错误及未知记录，并要求技能在继续工作前重新核验相关的实时状态。

## 开发验证

```sh
pnpm test
pnpm test:coverage
npm pack --dry-run
```
