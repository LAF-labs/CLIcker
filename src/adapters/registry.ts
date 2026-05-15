import type {AdapterAction, AgentAdapter, ResolvedAdapter} from "./types.js";

const commonActions: AdapterAction[] = [
  {
    id: "fix-build",
    label: "Fix build error",
    description: "Inspect the latest failure and fix the build with verification.",
    kind: "prompt",
    value:
      "Inspect the latest build or test failure visible in the terminal output. Find the root cause, make a scoped fix, and run the relevant verification command.",
  },
  {
    id: "explain-file",
    label: "Explain file",
    description: "Ask for a clear explanation of a file or module.",
    kind: "prompt",
    value:
      "Explain the relevant file or module in this project. Focus on responsibilities, important control flow, and risks a maintainer should know.",
  },
  {
    id: "refactor",
    label: "Refactor",
    description: "Request a safe scoped refactor.",
    kind: "prompt",
    value:
      "Refactor the relevant code in a small, safe scope. Preserve behavior, follow existing project patterns, and verify the change.",
  },
  {
    id: "write-tests",
    label: "Write tests",
    description: "Ask the agent to add focused tests.",
    kind: "prompt",
    value:
      "Add focused tests for the behavior we are changing. Keep the tests consistent with the existing test style and run the relevant test command.",
  },
  {
    id: "review-diff",
    label: "Review diff",
    description: "Review current git changes.",
    kind: "prompt",
    value:
      "Review the current git diff for bugs, regressions, missing tests, and maintainability risks. Lead with concrete findings and file references.",
  },
];

const enter = "\r";

function submitWithEnter(text: string): string {
  return `${text}${enter}`;
}

function adapter(
  input: Omit<AgentAdapter, "actions" | "submit"> & {
    actions?: AdapterAction[];
    submit?: (text: string) => string;
  },
): AgentAdapter {
  return {
    ...input,
    actions: [...commonActions, ...(input.actions ?? [])],
    submit: input.submit ?? submitWithEnter,
  };
}

export const adapters: AgentAdapter[] = [
  adapter({
    id: "claude",
    label: "Claude Code",
    level: "L2_COMMANDS",
    priority: "P0",
    binaries: ["claude"],
    actions: [
      {
        id: "claude-plan",
        label: "Plan first",
        description: "Ask Claude to plan before editing.",
        kind: "prompt",
        value: "Think through a concise implementation plan first. Do not edit files until the plan is clear.",
      },
      {
        id: "claude-compact",
        label: "Compact",
        description: "Request context compaction when supported.",
        kind: "command",
        value: "/compact",
      },
    ],
  }),
  adapter({
    id: "codex",
    label: "OpenAI Codex CLI",
    level: "L2_COMMANDS",
    priority: "P0",
    binaries: ["codex"],
    actions: [
      {
        id: "codex-suggest",
        label: "Suggest mode",
        description: "Ask Codex to keep changes proposed until approved.",
        kind: "prompt",
        value: "Work in suggest mode: analyze and propose edits or commands before applying them.",
      },
      {
        id: "codex-auto-edit",
        label: "Auto edit",
        description: "Ask Codex to apply file edits but be careful with commands.",
        kind: "prompt",
        value: "Use an auto-edit workflow for safe file changes, but ask before running risky shell commands.",
      },
    ],
  }),
  adapter({
    id: "gemini",
    label: "Gemini CLI",
    level: "L1_INJECT",
    priority: "P0",
    binaries: ["gemini"],
    actions: [
      {
        id: "gemini-context",
        label: "Find context",
        description: "Ask Gemini to inspect the repository before editing.",
        kind: "prompt",
        value: "Inspect the repository context first, identify the relevant files, then propose the smallest useful change.",
      },
    ],
  }),
  adapter({
    id: "cursor-agent",
    label: "Cursor CLI",
    level: "L2_COMMANDS",
    priority: "P0",
    binaries: ["cursor-agent"],
    actions: [
      {
        id: "cursor-review",
        label: "Security review",
        description: "Ask Cursor Agent to review changes for security issues.",
        kind: "prompt",
        value: "Review the current changes for security issues, data leaks, unsafe commands, and missing validation.",
      },
    ],
  }),
  adapter({
    id: "copilot",
    label: "GitHub Copilot CLI",
    level: "L2_COMMANDS",
    priority: "P0",
    binaries: ["copilot"],
    actions: [
      {
        id: "copilot-pr",
        label: "PR helper",
        description: "Ask Copilot for PR-oriented work.",
        kind: "prompt",
        value: "Analyze the current branch and help prepare a pull request summary, risk notes, and verification plan.",
      },
    ],
  }),
  adapter({
    id: "opencode",
    label: "OpenCode",
    level: "L2_COMMANDS",
    priority: "P0",
    binaries: ["opencode"],
    actions: [
      {
        id: "opencode-plan",
        label: "Plan agent",
        description: "Ask OpenCode for read-only planning.",
        kind: "prompt",
        value: "Use a planning workflow first. Explore the codebase, identify the change set, and avoid edits until the plan is ready.",
      },
    ],
  }),
  adapter({
    id: "aider",
    label: "Aider",
    level: "L2_COMMANDS",
    priority: "P1",
    binaries: ["aider"],
    actions: [
      {
        id: "aider-architect",
        label: "Architect",
        description: "Switch Aider toward architecture planning.",
        kind: "command",
        value: "/architect",
      },
      {
        id: "aider-add",
        label: "Add files",
        description: "Remind the user to add files to Aider context.",
        kind: "prompt",
        value: "Identify the files that should be added to the chat context, then tell me the exact /add commands to run.",
      },
    ],
  }),
  adapter({
    id: "cline",
    label: "Cline CLI",
    level: "L2_COMMANDS",
    priority: "P1",
    binaries: ["cline"],
    actions: [
      {
        id: "cline-plan",
        label: "Plan mode",
        description: "Ask Cline to plan before acting.",
        kind: "prompt",
        value: "Stay in Plan mode. Analyze the task and produce a concise plan before switching to implementation.",
      },
      {
        id: "cline-act",
        label: "Act mode",
        description: "Ask Cline to proceed with implementation.",
        kind: "prompt",
        value: "Proceed in Act mode with the agreed scoped implementation and verify the result.",
      },
    ],
  }),
  adapter({
    id: "devin",
    label: "Devin for Terminal",
    level: "L2_COMMANDS",
    priority: "P1",
    binaries: ["devin"],
    actions: [
      {
        id: "devin-plan",
        label: "Plan",
        description: "Use Devin planning mode.",
        kind: "command",
        value: "/plan",
      },
      {
        id: "devin-accept-edits",
        label: "Accept edits",
        description: "Use Devin accept-edits mode.",
        kind: "command",
        value: "/accept-edits",
      },
    ],
  }),
  adapter({
    id: "hermes",
    label: "Hermes Agent",
    level: "L1_INJECT",
    priority: "P1",
    binaries: ["hermes"],
    actions: [
      {
        id: "hermes-skills",
        label: "Use skills",
        description: "Ask Hermes to use or create durable skills.",
        kind: "prompt",
        value: "Use relevant Hermes skills and memory for this project. If a reusable workflow emerges, suggest a skill to capture it.",
      },
    ],
  }),
  adapter({
    id: "goose",
    label: "Goose",
    level: "L1_INJECT",
    priority: "P1",
    binaries: ["goose"],
    actions: [
      {
        id: "goose-recipe",
        label: "Recipe",
        description: "Ask Goose for a reusable recipe.",
        kind: "prompt",
        value: "If this task is repeatable, outline a Goose recipe or reusable workflow after completing the immediate fix.",
      },
    ],
  }),
  adapter({
    id: "qwen",
    label: "Qwen Code",
    level: "L1_INJECT",
    priority: "P1",
    binaries: ["qwen"],
    actions: [
      {
        id: "qwen-local",
        label: "Local-friendly",
        description: "Ask Qwen Code for a compact context workflow.",
        kind: "prompt",
        value: "Use a context-efficient workflow. Inspect only the relevant files, make a small change, and summarize verification.",
      },
    ],
  }),
];

export function listAdapters(): AgentAdapter[] {
  return adapters;
}

export function resolveAdapter(target: string): ResolvedAdapter {
  const found = adapters.find(
    candidate => candidate.id === target || candidate.binaries.includes(target),
  );

  if (found) {
    return {
      adapter: found,
      binary: target,
    };
  }

  return {
    binary: target,
    adapter: adapter({
      id: "generic",
      label: `Generic (${target})`,
      level: "L0_DETECT",
      priority: "GENERIC",
      binaries: [target],
    }),
  };
}
