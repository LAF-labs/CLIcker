# CLIcker Development Specification

## 1. Product Summary

**Project name:** CLIcker

**One-line description:** CLIcker preserves existing terminal AI coding agents and makes their visible UI clickable.

**Primary goal:** Let developers keep using existing CLIs such as `claude`, `codex`, `gemini`, `opencode`, `aider`, `hermes`, or `grok`, while CLIcker adds a thin Grok Build-inspired click layer for choices, autocomplete rows, command hints, and action hints.

**Target users:** Developers who already use Claude Code, OpenAI Codex CLI, Gemini CLI, Cursor CLI, GitHub Copilot CLI, OpenCode, Aider, Cline CLI, Devin for Terminal, Hermes Agent, Goose, Qwen Code, or Grok CLI and want the same native CLI experience with more convenient touch/click operation.

## 2. Product Principle

CLIcker does not replace upstream agents, re-skin their screens, or mirror their command systems.

The core product is:

```text
Original CLI in a PTY + click interpretation over visible terminal text
```

The wrapped agent owns the entire experience: output, prompt, autocomplete, plans, plugins, command syntax, approval flow, and keyboard shortcuts. CLIcker only forwards mouse input or converts obvious visible choices into the same keyboard input the user would have typed.

## 3. Grok Build UX Reference

Grok Build's public beta pages show terminal-native click/touch patterns that CLIcker should support generically:

- Footer hints such as `Enter:run`, `Esc:reset`, `Tab:next`, `Shift-Tab normal`, `Ctrl+H home`, and `^-q quit`.
- Action hints such as `Click:take over` and `Click:pin agent`.
- Slash command and autocomplete rows.
- Multiple-choice, radio-like, and checkbox-like selections.
- Terminal-first interaction where keyboard use remains fully available.

CLIcker should borrow those click mechanics, not Grok Build's branding, layout, agent behavior, or feature set.

## 4. Adapter Support Scope

Adapters identify known binaries and display a friendly name. They do not implement agent-specific commands or recreate native UI.

### P0 Adapters

| Agent | Command | CLIcker behavior |
| --- | --- | --- |
| Claude Code | `claude` | Run unchanged, with click passthrough and visible-text click inference |
| OpenAI Codex CLI | `codex` | Run unchanged, with click passthrough and visible-text click inference |
| Gemini CLI | `gemini` | Run unchanged, with click passthrough and visible-text click inference |
| Cursor CLI | `cursor-agent` | Run unchanged, with click passthrough and visible-text click inference |
| GitHub Copilot CLI | `copilot` | Run unchanged, with click passthrough and visible-text click inference |
| OpenCode | `opencode` | Run unchanged, with click passthrough and visible-text click inference |

### P1 Adapters

| Agent | Command | CLIcker behavior |
| --- | --- | --- |
| Aider | `aider` | Run unchanged, with click passthrough and visible-text click inference |
| Cline CLI | `cline` | Run unchanged, with click passthrough and visible-text click inference |
| Devin for Terminal | `devin` | Run unchanged, with click passthrough and visible-text click inference |
| Hermes Agent | `hermes` | Run unchanged, with click passthrough and visible-text click inference |
| Goose | `goose` | Run unchanged, with click passthrough and visible-text click inference |
| Qwen Code | `qwen` | Run unchanged, with click passthrough and visible-text click inference |
| Grok CLI | `grok`, `grok-dev` | Run unchanged, with click passthrough and visible-text click inference |

## 5. Adapter Maturity

```ts
type AdapterLevel = "L0_DETECT" | "L1_CLICK";
```

| Level | Meaning |
| --- | --- |
| L0_DETECT | Launch an arbitrary command through the generic PTY wrapper |
| L1_CLICK | Recognize a known coding-agent CLI and run it unchanged with generic click enhancement |

## 6. Architecture

```text
clicker <target> [...args]
        |
        v
Adapter Resolver
        |
        v
PTY Runtime (node-pty)
        |
        v
Original CLI process
        |
        v
Full-screen terminal view + click passthrough/inference layer
```

## 7. Click Behavior

CLIcker uses two paths:

1. If the wrapped CLI enables terminal mouse tracking, CLIcker lets the terminal forward mouse input to the original process.
2. If no mouse tracking is active, CLIcker reads the clicked visible line and sends the inferred native keyboard input.

Generic inference supports:

| Visible pattern | Example | Sent input |
| --- | --- | --- |
| Key/action hints | `Enter:run`, `Enter send` | Enter |
| Escape hints | `Esc:reset`, `Esc clear` | Escape |
| Tab hints | `Tab:next`, `Shift-Tab normal` | Tab or Shift-Tab |
| Control hints | `Ctrl+H home`, `^-q quit` | Matching control key |
| Click action hints | `Click:take over` | Enter activation |
| Numbered choices | `1. option`, `2 (○) option` | Selector plus Enter |
| Letter choices | `a. option`, `z ( ) option` | Selector plus Enter |
| Checkbox/radio rows | `[ ] option`, `(○) option` | Enter |
| Slash suggestions | `/review`, `/plugins` | Command text plus trailing space |

This layer is intentionally conservative. If CLIcker cannot infer a safe native input, it does nothing and leaves keyboard control untouched.

## 8. CLI Design

```bash
clicker <target> [...args]
clicker claude
clicker codex --full-auto
clicker gemini
clicker grok
clicker setup
clicker setup --remove
clicker setup --dry-run
clicker adapters
clicker config
```

Unknown options are allowed so native agent flags pass through unchanged.

## 9. Adapter Interface

```ts
export interface AgentAdapter {
  id: string;
  label: string;
  level: AdapterLevel;
  priority: "P0" | "P1" | "P2" | "GENERIC";
  binaries: string[];
  defaultArgs?: string[];
}
```

## 10. Alias Setup

`clicker setup` may add aliases to user shell rc files.

Example:

```bash
alias claude='clicker claude'
alias codex='clicker codex'
alias gemini='clicker gemini'
alias grok='clicker grok'
```

Requirements:

- Use marker comments so repeated setup is idempotent.
- Support `--dry-run`.
- Support `--remove`.
- Support zsh, bash, and fish.
- Never delete unrelated user content.

## 11. Success Criteria

CLIcker is successful if:

- A user can run a P0/P1 agent inside CLIcker without changing the agent's native UI, command syntax, or workflow.
- Native agent flags and commands pass through unchanged.
- CLIs with built-in mouse support still receive their own mouse events.
- CLIs without mouse support gain useful clicking for visible hints, choices, and autocomplete suggestions.
- Unsupported commands still work through the generic PTY wrapper.
