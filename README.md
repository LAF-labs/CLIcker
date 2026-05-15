# CLIcker

CLIcker is a Grok Build-style shell for terminal AI coding agents.

It wraps tools such as Claude Code, Codex CLI, Gemini CLI, Cursor CLI, GitHub Copilot CLI, OpenCode, Aider, Cline, Devin, Hermes, Goose, Qwen Code, and Grok CLI without replacing them.

CLIcker keeps the original CLI running in a real PTY, then adds a Grok Build-inspired experience around it: fullscreen transcript, status chrome, bottom composer, slash command palette, plan review, plugins/skills, Q&A, and subagent-style overlays.

```bash
npm install
npm run dev -- claude
npm run dev -- codex --full-auto
npm run dev -- adapters
npm run dev -- grok
```

Inside CLIcker:

- Type normally and press Enter to send text to the wrapped CLI.
- Type `/` or press Tab to open the command palette.
- Use `/plan`, `/plugins`, `/questions`, `/subagents`, `/review`, or `/btw` for Grok Build-style flows.
- Press `Ctrl+Q` to quit the wrapper.

The product name is **CLIcker**. The local binary is `clicker`.

See [docs/SPEC.md](docs/SPEC.md) for the product and technical specification.
