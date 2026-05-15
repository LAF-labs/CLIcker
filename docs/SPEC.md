# CLIcker Development Specification

## 1. Product Summary

**Project name:** CLIcker

**One-line description:** CLIcker is a universal PTY wrapper that adds a convenient mouse/touch control pad to terminal-native AI coding agents.

**Primary goal:** Let developers keep using their existing commands such as `claude`, `codex`, `gemini`, `opencode`, `aider`, `hermes`, or `grok` exactly as those tools intend, while CLIcker provides clickable terminal controls around the original CLI.

**Target users:** Developers who regularly use terminal AI coding agents including Claude Code, OpenAI Codex CLI, Gemini CLI, Cursor CLI, GitHub Copilot CLI, OpenCode, Aider, Cline CLI, Devin for Terminal, Hermes Agent, Goose, Qwen Code, and Grok CLI.

## 2. Product Principle

CLIcker does not rewrite, imitate, or normalize upstream agents. It wraps them.

The core product is:

```text
Original CLI in a PTY + clickable terminal control pad
```

Each agent keeps its own commands, modes, prompts, approval model, UI, and habits. CLIcker only makes terminal interaction easier to click or touch.

Grok CLI is a useful reference for modern agent ergonomics: controls should be fast, visible, and remote-friendly. CLIcker applies that lesson as a thin control surface, not as a new agent workflow.

## 3. Adapter Support Scope

Adapters are intentionally light. They identify known binaries and display a friendly name. They do not define agent-specific slash commands or prompt templates.

### P0 Adapters

| Agent | Command | CLIcker behavior |
| --- | --- | --- |
| Claude Code | `claude` | Launch unchanged, add touch controls |
| OpenAI Codex CLI | `codex` | Launch unchanged, pass flags through, add touch controls |
| Gemini CLI | `gemini` | Launch unchanged, add touch controls |
| Cursor CLI | `cursor-agent` | Launch unchanged, add touch controls |
| GitHub Copilot CLI | `copilot` | Launch unchanged, add touch controls |
| OpenCode | `opencode` | Launch unchanged, add touch controls |

### P1 Adapters

| Agent | Command | CLIcker behavior |
| --- | --- | --- |
| Aider | `aider` | Launch unchanged, add touch controls |
| Cline CLI | `cline` | Launch unchanged, add touch controls |
| Devin for Terminal | `devin` | Launch unchanged, add touch controls |
| Hermes Agent | `hermes` | Launch unchanged, add touch controls |
| Goose | `goose` | Launch unchanged, add touch controls |
| Qwen Code | `qwen` | Launch unchanged, add touch controls |
| Grok CLI | `grok`, `grok-dev` | Launch unchanged, add touch controls |

## 4. Adapter Maturity Levels

```ts
type AdapterLevel = "L0_DETECT" | "L1_TOUCH";
```

| Level | Meaning |
| --- | --- |
| L0_DETECT | Launch an arbitrary target in the generic PTY wrapper |
| L1_TOUCH | Recognize a supported CLI name and show the standard touch control pad |

Future adapter levels may add user-configured buttons, but built-in adapters should stay conservative unless the user explicitly asks for agent-specific shortcuts.

## 5. Core Architecture

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
Original CLI
        |
        v
CLIcker TUI: viewport + touch pad + text sender
```

## 6. Technical Stack

| Area | Choice |
| --- | --- |
| Language | TypeScript |
| CLI parser | Commander |
| PTY runtime | node-pty |
| TUI | blessed |
| Config | conf |
| Build | tsc |

## 7. CLI Design

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

## 8. TUI Layout

```text
+ CLIcker  Claude Code  P0  L1_TOUCH ----------------------+
| claude --flag | cwd: project | touch controls only         |
+ Touch ----------------------+-- PTY Viewport -------------+
| Focus terminal              | Original upstream CLI output |
| Prompt box                  | ANSI output from PTY         |
| Enter                       |                              |
| Escape                      |                              |
| Tab                         |                              |
| Up / Down / Left / Right    |                              |
| Ctrl+C / Ctrl+D / Ctrl+L    |                              |
| Clear view                  |                              |
| Quit wrapper                |                              |
+ Button ---------------------+                              |
| Selected button details     |                              |
+-----------------------------+------------------------------+
| Send Text: text sent to the original CLI                   |
| Thin touch layer | Click buttons or type directly          |
+------------------------------------------------------------+
```

## 9. Touch Controls

The built-in touch pad provides only terminal-level controls:

| Button | Effect |
| --- | --- |
| Focus terminal | Put keyboard focus back into the PTY viewport |
| Prompt box | Focus the CLIcker text sender |
| Enter | Send carriage return |
| Escape | Send ESC |
| Tab | Send tab |
| Up / Down / Left / Right | Send arrow-key escape sequences |
| Ctrl+C | Send interrupt to the wrapped CLI |
| Ctrl+D | Send EOF to the wrapped CLI |
| Ctrl+L | Send redraw/clear-screen control character to the wrapped CLI |
| Clear view | Clear only CLIcker's viewport |
| Quit wrapper | Close CLIcker and terminate the wrapped process |

CLIcker should not guess which upstream command the user wants. The user remains in control of each agent's native interface.

## 10. Generic Behavior

- Launch the target in a PTY with inherited `cwd`, `env`, terminal size, and args.
- Render upstream output in a scrollable terminal viewport.
- Pass keyboard input to the PTY when the viewport is focused.
- Let the text sender submit plain user text followed by Enter.
- Support mouse clicks for the touch pad.
- Avoid agent-specific prompt injection in built-in adapters.

## 11. Adapter Interface

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

## 12. Alias Setup

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

## 13. Non-Goals

- Reimplementing upstream agent UIs.
- Mirroring every slash command from every agent.
- Replacing native agent documentation or workflows.
- Guaranteeing that every upstream approval prompt can be clicked semantically.
- Parsing every terminal screen into structured state.

## 14. Success Criteria

CLIcker is successful if:

- A user can run a P0/P1 agent inside CLIcker without breaking normal keyboard usage.
- Native agent flags and usage pass through unchanged.
- Common terminal controls are convenient to click or touch.
- Alias setup is safe and reversible.
- Unsupported commands still work through the generic PTY wrapper.
