# CLIcker Development Specification v1.1

## 1. Product Summary

**Project name:** CLIcker

**One-line description:** CLIcker is a universal PTY-based wrapper that turns terminal-native AI coding agents into a clickable control surface with agent-specific adapters.

**Primary goal:** Let developers keep typing their existing commands such as `claude`, `codex`, `gemini`, `opencode`, `aider`, or `hermes`, while CLIcker runs the original agent inside a PTY and adds a clickable sidebar, common task buttons, mode controls, and session utilities.

**Target users:** Developers who regularly use terminal AI coding agents including Claude Code, OpenAI Codex CLI, Gemini CLI, Cursor CLI, GitHub Copilot CLI, OpenCode, Aider, Cline CLI, Devin for Terminal, Hermes Agent, Goose, and Qwen Code.

## 2. Product Principle

CLIcker does not rewrite upstream agents. It wraps them.

The core product is:

```text
Universal PTY wrapper + agent-specific adapter registry + clickable TUI shell
```

This means every supported CLI should work at a generic terminal level first. Better clickable behavior is added progressively through adapters.

## 3. Adapter Support Scope

CLIcker will support adapters through P1 in the first major implementation wave.

### P0 Adapters

P0 adapters are top priority because they represent the most common modern terminal coding-agent workflows.

| Agent | Command | Initial adapter goals |
| --- | --- | --- |
| Claude Code | `claude` | Slash commands, common prompts, approval hints |
| OpenAI Codex CLI | `codex` | Suggest/auto-edit/full-auto mode prompts, common tasks |
| Gemini CLI | `gemini` | File mention helpers, prompt injection, generic session control |
| Cursor CLI | `cursor-agent` | Prompt mode, resume/list helpers, rules/MCP awareness |
| GitHub Copilot CLI | `copilot` | GitHub issue/PR task prompts, MCP-aware workflows |
| OpenCode | `opencode` | Build/plan workflow prompts, session/share helpers |

### P1 Adapters

P1 adapters broaden coverage to the agent tools power users are adopting for local, open, or enterprise workflows.

| Agent | Command | Initial adapter goals |
| --- | --- | --- |
| Aider | `aider` | `/add`, `/model`, code/architect/ask/help prompt helpers |
| Cline CLI | `cline` | Plan/Act mode prompts, auto-approve guidance, TUI/headless awareness |
| Devin for Terminal | `devin` | Normal/accept-edits/bypass/plan prompt helpers, session commands |
| Hermes Agent | `hermes` | Chat/provider/skills/memory-oriented workflows |
| Goose | `goose` | MCP/ACP, recipe, and general-agent workflow prompts |
| Qwen Code | `qwen` | Interactive/headless workflow prompts, Qwen-oriented tasks |

## 4. Adapter Maturity Levels

Adapters are intentionally incremental.

```ts
type AdapterLevel =
  | "L0_DETECT"
  | "L1_INJECT"
  | "L2_COMMANDS"
  | "L3_PARSE"
  | "L4_PROTOCOL";
```

| Level | Meaning |
| --- | --- |
| L0_DETECT | Detect and launch the agent in the generic PTY wrapper |
| L1_INJECT | Inject prompts and common task text safely |
| L2_COMMANDS | Expose slash commands, modes, and sessions as UI actions |
| L3_PARSE | Parse output for approval prompts, status, and completion signals |
| L4_PROTOCOL | Use structured protocols such as ACP, JSON streams, or SDKs |

The v1 implementation target is L1-L2 for P0/P1 agents. L3-L4 are later hardening work.

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
Terminal Screen Buffer / ANSI Stream
        |
        v
Clickable TUI Shell
        |
        v
Adapter Actions / Prompt Injection / Session Commands
```

## 6. Technical Stack

| Area | Choice | Reason |
| --- | --- | --- |
| Language | TypeScript | Type safety and npm ecosystem |
| CLI parser | Commander | Simple `clicker <target> [...args]` command structure |
| PTY runtime | node-pty | Required for real interactive terminal agents |
| TUI | blessed / neo-blessed style architecture | More practical for mouse and terminal layout than Ink-only rendering |
| Config | conf | Cross-platform user config storage |
| Build | tsc | Simple npm package build |

Ink can still be revisited later, but the default implementation should favor PTY-first terminal control.

## 7. CLI Design

```bash
clicker <target> [...args]
clicker claude
clicker codex --full-auto
clicker gemini
clicker setup
clicker setup --remove
clicker setup --dry-run
clicker adapters
clicker config
```

The branded product name is CLIcker. The binary name is `clicker`.

## 8. TUI Layout

```text
┌ CLIcker ─────────────────────────────────────────────────┐
│ Agent: Claude Code   Mode: Generic   Status: Running      │
├──────────── Sidebar ───────────┬──── PTY Viewport ────────┤
│ New Session                    │ Real upstream CLI output  │
│ Clear View                     │ ANSI output from PTY       │
│ Send Common Task               │                            │
│ ─────────────────────────────  │                            │
│ Common Tasks                   │                            │
│ - Fix build error              │                            │
│ - Explain file                 │                            │
│ - Refactor                     │                            │
│ - Write tests                  │                            │
│ - Review diff                  │                            │
│ ─────────────────────────────  │                            │
│ Agent Actions                  │                            │
│ - Adapter-specific buttons     │                            │
├────────────────────────────────┴───────────────────────────┤
│ Input: prompt text sent through adapter injection            │
└──────────────────────────────────────────────────────────────┘
```

## 9. Generic Behavior

All targets get these behaviors:

- Launch in PTY with inherited `cwd`, `env`, terminal size, and args.
- Render upstream output in a scrollable terminal viewport.
- Pass keyboard input to the PTY by default.
- Reserve wrapper keybindings for explicit CLIcker controls.
- Provide common prompt injection actions.
- Support mouse clicks for sidebar actions.

## 10. Common Task Prompts

Common tasks are text prompts injected into the running agent.

| Task | Prompt intent |
| --- | --- |
| Fix build error | Ask the agent to inspect recent output and fix the failing build |
| Explain file | Ask for an explanation of a referenced file |
| Refactor | Ask for a safe, scoped refactor |
| Write tests | Ask for relevant tests and verification |
| Review diff | Ask for a code review of current git changes |
| Generate PR description | Ask for a PR summary and test plan |

## 11. Adapter Interface

```ts
export interface AgentAdapter {
  id: string;
  label: string;
  level: AdapterLevel;
  binaries: string[];
  defaultArgs?: string[];
  actions: AdapterAction[];
  submit: (text: string) => string;
}
```

The first implementation should keep adapters declarative. Output parsing and structured protocol integrations can be added later.

## 12. Alias Setup

`clicker setup` may add aliases to user shell rc files.

Example:

```bash
alias claude='clicker claude'
alias codex='clicker codex'
alias gemini='clicker gemini'
```

Requirements:

- Use marker comments so repeated setup is idempotent.
- Support `--dry-run`.
- Support `--remove`.
- Support zsh, bash, fish, and PowerShell over time.
- Never delete unrelated user content.

## 13. Roadmap

### Phase 0: Foundation

- Create TypeScript CLI package.
- Add adapter registry with P0/P1 metadata.
- Add generic PTY launch with `node-pty`.
- Add initial blessed-based TUI layout.

### Phase 1: P0 Support

- Implement first-click common tasks for Claude Code, Codex, Gemini, Cursor CLI, Copilot CLI, and OpenCode.
- Add agent-specific mode/action prompts.
- Add shell alias setup/remove/dry-run.

### Phase 2: P1 Support

- Add Aider, Cline CLI, Devin, Hermes, Goose, and Qwen Code adapters.
- Add session and slash-command helpers where safe.
- Add adapter config overrides.

### Phase 3: Hardening

- Add output parsers for approvals and agent status.
- Add structured JSON/ACP integration where available.
- Add tests for adapter registry, alias setup, and prompt injection.

## 14. Non-Goals for v1

- Reimplementing the upstream agent UI.
- Full semantic parsing of every terminal screen.
- Guaranteeing that every upstream approval prompt can be clicked.
- Replacing IDE-native agents such as Windsurf or Roo Code.

## 15. Success Criteria

CLIcker v1 is successful if:

- A user can run a P0/P1 agent inside CLIcker without breaking normal keyboard usage.
- Common task buttons reliably inject prompts.
- Adapter-specific actions are visible and useful.
- Alias setup is safe and reversible.
- Unsupported agents still work through the generic PTY wrapper.
