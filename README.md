# CLIcker

CLIcker is a click-enhancement layer for terminal AI coding agents.

It wraps tools such as Claude Code, Codex CLI, Gemini CLI, Cursor CLI, GitHub Copilot CLI, OpenCode, Aider, Cline, Devin, Hermes, Goose, Qwen Code, and Grok CLI without replacing their native screens, commands, shortcuts, or workflows.

The original CLI still runs in a real PTY. CLIcker keeps that terminal view intact and adds Grok Build-inspired click behavior on top:

- If the wrapped CLI already enables terminal mouse tracking, clicks pass through directly.
- If it does not, CLIcker reads the visible line under the cursor and turns common hints into keyboard input.
- Clickable text includes hints like `Enter:run`, `Esc:reset`, `Tab:next`, `Ctrl+H home`, `^-q quit`, numbered choices, radio/checkbox-style rows, and slash command suggestions.

```bash
npm install
npm run dev -- claude
npm run dev -- codex --full-auto
npm run dev -- adapters
npm run dev -- grok
```

Inside CLIcker:

- Type normally; input goes to the wrapped CLI.
- Click visible commands, choices, autocomplete rows, and keyboard hints when CLIcker can infer the native keypress.
- Press `Ctrl+Q` to quit the wrapper.

The product name is **CLIcker**. The local binary is `clicker`.

See [docs/SPEC.md](docs/SPEC.md) for the product and technical specification.
