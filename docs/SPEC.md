# CLIcker Development Specification

## 1. Product Summary

**Project name:** CLIcker

**One-line description:** CLIcker is a universal PTY wrapper that preserves terminal-native AI coding agents and passes through direct mouse/touch interaction where the wrapped CLI supports it.

**Primary goal:** Let developers keep using their existing commands such as `claude`, `codex`, `gemini`, `opencode`, `aider`, `hermes`, or `grok` exactly as those tools intend, while CLIcker makes the original terminal surface easier to click or touch.

**Target users:** Developers who regularly use terminal AI coding agents including Claude Code, OpenAI Codex CLI, Gemini CLI, Cursor CLI, GitHub Copilot CLI, OpenCode, Aider, Cline CLI, Devin for Terminal, Hermes Agent, Goose, Qwen Code, and Grok CLI.

## 2. Product Principle

CLIcker does not rewrite, imitate, or normalize upstream agents. It wraps them.

The core product is:

```text
Original CLI in a PTY + terminal mouse passthrough + fallback control pad
```

Each agent keeps its own commands, modes, prompts, approval model, UI, and habits. CLIcker first tries to make the agent's own terminal UI clickable by passing mouse events through to the PTY. The fallback pad is secondary.

Grok CLI is a useful reference for modern agent ergonomics: controls should be fast, visible, and remote-friendly. CLIcker applies that lesson as a thin control surface, not as a new agent workflow.

## 3. Adapter Support Scope

Adapters are intentionally light. They identify known binaries and display a friendly name. They do not define agent-specific slash commands or prompt templates.

### P0 Adapters

| Agent | Command | CLIcker behavior |
| --- | --- | --- |
| Claude Code | `claude` | Launch unchanged, pass mouse-capable terminal UI through |
| OpenAI Codex CLI | `codex` | Launch unchanged, pass flags and mouse-capable terminal UI through |
| Gemini CLI | `gemini` | Launch unchanged, pass mouse-capable terminal UI through |
| Cursor CLI | `cursor-agent` | Launch unchanged, pass mouse-capable terminal UI through |
| GitHub Copilot CLI | `copilot` | Launch unchanged, pass mouse-capable terminal UI through |
| OpenCode | `opencode` | Launch unchanged, pass mouse-capable terminal UI through |

### P1 Adapters

| Agent | Command | CLIcker behavior |
| --- | --- | --- |
| Aider | `aider` | Launch unchanged, pass mouse-capable terminal UI through |
| Cline CLI | `cline` | Launch unchanged, pass mouse-capable terminal UI through |
| Devin for Terminal | `devin` | Launch unchanged, pass mouse-capable terminal UI through |
| Hermes Agent | `hermes` | Launch unchanged, pass mouse-capable terminal UI through |
| Goose | `goose` | Launch unchanged, pass mouse-capable terminal UI through |
| Qwen Code | `qwen` | Launch unchanged, pass mouse-capable terminal UI through |
| Grok CLI | `grok`, `grok-dev` | Launch unchanged, pass mouse-capable terminal UI through |

## 4. Adapter Maturity Levels

```ts
type AdapterLevel = "L0_DETECT" | "L1_TOUCH";
```

| Level | Meaning |
| --- | --- |
| L0_DETECT | Launch an arbitrary target in the generic PTY wrapper |
| L1_TOUCH | Recognize a supported CLI name, render the PTY with mouse passthrough, and show fallback controls |

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
CLIcker TUI: terminal viewport + fallback pad + text sender
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
| claude --flag | cwd: project | direct CLI clicks first      |
+ Fallback -------------------+-- PTY Viewport -------------+
| Direct CLI                  | Original upstream CLI output |
| Prompt box                  | ANSI output from PTY         |
| Enter                       |                              |
| Escape                      |                              |
| Tab                         |                              |
| Up / Down / Left / Right    |                              |
| Ctrl+C / Ctrl+D / Ctrl+L    |                              |
| Clear view                  |                              |
| Quit wrapper                |                              |
+ Status ---------------------+                              |
| Selected fallback details   |                              |
+-----------------------------+------------------------------+
| Send Text: text sent to the original CLI                   |
| Click inside the CLI first | fallback keys are on the left |
+------------------------------------------------------------+
```

## 9. Direct Mouse Passthrough

The PTY viewport is the primary interaction surface. CLIcker renders upstream ANSI output with a terminal emulator and forwards keyboard input directly while the viewport is focused.

When the wrapped CLI enables terminal mouse tracking, CLIcker forwards mouse events back to the PTY using the terminal's mouse protocol. That means native clickable menus, autocomplete lists, approval prompts, and selection UIs can work through CLIcker without CLIcker knowing their semantics.

If the wrapped CLI does not enable terminal mouse tracking, CLIcker should not inject arbitrary mouse escape sequences. In that case, clicks focus the viewport and wheel events scroll CLIcker's viewport.

## 10. Fallback Controls

The fallback pad provides terminal-level controls for CLIs or terminals where direct mouse interaction is not active:

| Button | Effect |
| --- | --- |
| Direct CLI | Put keyboard focus back into the PTY viewport |
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

## 11. Generic Behavior

- Launch the target in a PTY with inherited `cwd`, `env`, terminal size, and args.
- Render upstream output in a terminal emulator viewport, preserving ANSI state.
- Pass keyboard input to the PTY when the viewport is focused.
- Pass mouse events to the PTY when the wrapped CLI enables terminal mouse tracking.
- Let the text sender submit plain user text followed by Enter.
- Keep the fallback pad secondary to direct viewport interaction.
- Avoid agent-specific prompt injection in built-in adapters.

## 12. Adapter Interface

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

## 13. Alias Setup

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

## 14. Non-Goals

- Reimplementing upstream agent UIs.
- Mirroring every slash command from every agent.
- Replacing native agent documentation or workflows.
- Sending mouse escape sequences to CLIs that have not enabled terminal mouse tracking.
- Guaranteeing semantic clicking for CLIs that expose only plain text and keyboard navigation.
- Parsing every terminal screen into structured state.

## 15. Success Criteria

CLIcker is successful if:

- A user can run a P0/P1 agent inside CLIcker without breaking normal keyboard usage.
- Native agent flags and usage pass through unchanged.
- Native mouse-capable terminal UI elements can be clicked through CLIcker.
- Fallback terminal controls are convenient to click or touch.
- Alias setup is safe and reversible.
- Unsupported commands still work through the generic PTY wrapper.
