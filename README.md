# CLIcker

CLIcker is a PTY-based touch layer for terminal AI coding agents.

It wraps tools such as Claude Code, Codex CLI, Gemini CLI, Cursor CLI, GitHub Copilot CLI, OpenCode, Aider, Cline, Devin, Hermes, Goose, Qwen Code, and Grok CLI without replacing them.

CLIcker does not copy each agent's commands or personality. It keeps the original CLI running in a real PTY and adds a small mouse/touch control pad for common terminal keys, focus changes, text sending, viewport clearing, and wrapper quit.

```bash
npm install
npm run dev -- claude
npm run dev -- codex --full-auto
npm run dev -- adapters
npm run dev -- grok
```

The product name is **CLIcker**. The local binary is `clicker`.

See [docs/SPEC.md](docs/SPEC.md) for the touch-first product and technical specification.
