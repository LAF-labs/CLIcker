# CLIcker Development Specification

## 1. Product Summary

**Project name:** CLIcker

**One-line description:** CLIcker wraps existing terminal AI coding agents in a Grok Build-style fullscreen shell.

**Primary goal:** Let developers keep using existing CLIs such as `claude`, `codex`, `gemini`, `opencode`, `aider`, `hermes`, or `grok`, while CLIcker gives them a modern Grok Build-like command surface: transcript, bottom composer, slash palette, plan review, plugins/skills, Q&A, and subagent dashboards.

**Target users:** Developers who like the Grok Build CLI experience and want comparable ergonomics around Claude Code, OpenAI Codex CLI, Gemini CLI, Cursor CLI, GitHub Copilot CLI, OpenCode, Aider, Cline CLI, Devin for Terminal, Hermes Agent, Goose, Qwen Code, and Grok CLI.

## 2. Product Principle

CLIcker does not replace upstream agents. It wraps them in a higher-level shell.

The core product is:

```text
Original CLI in a PTY + Grok Build-style TUI shell
```

The wrapped agent remains the execution engine. CLIcker owns the surrounding experience: status chrome, input composer, command palette, overlays, and orchestration affordances.

## 3. Grok Build UX Reference

Grok Build's public beta page shows these core patterns:

- A fullscreen dark terminal surface with minimal chrome.
- A top status row showing repo/path, turn count, and progress/context.
- A main transcript area with thoughts, edits, diffs, and task output.
- A bottom composer using `›` as the prompt.
- A command palette/autocomplete flow for slash commands.
- Plan review with `plan.md` in a framed viewer.
- Tabs for hooks, plugins, marketplace, skills, and MCP servers.
- Multiple-choice clarification panels.
- Parallel subagent dashboards.
- Footer hints such as `Enter send`, `Tab`, `Esc`, and `^-q quit`.

CLIcker should recreate this interaction shape generically for other CLIs.

## 4. Adapter Support Scope

Adapters identify known binaries and display a friendly name. They do not need to mirror every native slash command.

### P0 Adapters

| Agent | Command | CLIcker behavior |
| --- | --- | --- |
| Claude Code | `claude` | Run unchanged behind the Grok-style shell |
| OpenAI Codex CLI | `codex` | Run unchanged behind the Grok-style shell |
| Gemini CLI | `gemini` | Run unchanged behind the Grok-style shell |
| Cursor CLI | `cursor-agent` | Run unchanged behind the Grok-style shell |
| GitHub Copilot CLI | `copilot` | Run unchanged behind the Grok-style shell |
| OpenCode | `opencode` | Run unchanged behind the Grok-style shell |

### P1 Adapters

| Agent | Command | CLIcker behavior |
| --- | --- | --- |
| Aider | `aider` | Run unchanged behind the Grok-style shell |
| Cline CLI | `cline` | Run unchanged behind the Grok-style shell |
| Devin for Terminal | `devin` | Run unchanged behind the Grok-style shell |
| Hermes Agent | `hermes` | Run unchanged behind the Grok-style shell |
| Goose | `goose` | Run unchanged behind the Grok-style shell |
| Qwen Code | `qwen` | Run unchanged behind the Grok-style shell |
| Grok CLI | `grok`, `grok-dev` | Run unchanged behind the Grok-style shell |

## 5. Adapter Maturity

```ts
type AdapterLevel = "L0_DETECT" | "L1_SHELL";
```

| Level | Meaning |
| --- | --- |
| L0_DETECT | Launch an arbitrary command through the generic PTY wrapper |
| L1_SHELL | Recognize a known coding-agent CLI and present it inside the Grok Build-style shell |

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
CLIcker shell: terminal transcript + composer + palette + overlays
```

## 7. TUI Layout

```text
xai/main user/repo                                  4 ↵ 4.56%│

› Codex CLI    CLIcker · grok-build-style · normal

  Original CLI transcript rendered here
  Thought, edit, diff, and command output flow through the PTY

┌─ command palette ─────────────────────────────────────────┐
│ /plan         Open plan review and fill a planning prompt  │
│ /plugins      Hooks Plugins Marketplace Skills MCP Servers │
│ /questions    Multiple-choice clarification panel          │
│ /subagents    Parallel subagent dashboard                  │
└────────────────────────────────────────────────────────────┘

┌─ › codex · normal ────────────────────────────────────────┐
│ Type a task or /command                                    │
└────────────────────────────────────────────────────────────┘
Enter send | Shift-Tab normal/plan | Tab commands | ^-q quit
```

## 8. Built-In Shell Commands

| Command | Behavior |
| --- | --- |
| `/plan` | Switch to plan review mode, open `plan.md`-style panel, and fill a planning prompt |
| `/review` | Fill a code review prompt for the wrapped CLI |
| `/btw` | Fill a side-question prompt |
| `/skills` | Open the skills/plugins browser |
| `/plugins` | Open hooks/plugins/marketplace/skills/MCP browser |
| `/questions` | Open a multiple-choice clarification panel |
| `/subagents` | Open a parallel subagent dashboard |
| `/approve` | Switch shell status to always-approve display mode |
| `/clear` | Clear the visible transcript |
| `/quit` | Quit CLIcker |

These shell commands are CLIcker UX commands. They may fill prompts or open panels; the wrapped CLI still performs the real work.

## 9. CLI Design

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

## 10. Adapter Interface

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

## 11. Alias Setup

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

## 12. Success Criteria

CLIcker is successful if:

- A user can run a P0/P1 agent inside CLIcker without breaking native CLI usage.
- The shell feels visually and ergonomically close to Grok Build.
- Slash palette, plan viewer, plugin/skills browser, Q&A, and subagent panels are reachable by keyboard and mouse.
- Native agent flags and commands pass through unchanged.
- Unsupported commands still work through the generic PTY wrapper.
