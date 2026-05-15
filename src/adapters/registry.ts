import type {AgentAdapter, ResolvedAdapter} from "./types.js";

function adapter(input: Omit<AgentAdapter, "level"> & {level?: AgentAdapter["level"]}): AgentAdapter {
  return {
    ...input,
    level: input.level ?? "L1_CLICK",
  };
}

export const adapters: AgentAdapter[] = [
  adapter({
    id: "claude",
    label: "Claude Code",
    priority: "P0",
    binaries: ["claude"],
  }),
  adapter({
    id: "codex",
    label: "OpenAI Codex CLI",
    priority: "P0",
    binaries: ["codex"],
  }),
  adapter({
    id: "gemini",
    label: "Gemini CLI",
    priority: "P0",
    binaries: ["gemini"],
  }),
  adapter({
    id: "cursor-agent",
    label: "Cursor CLI",
    priority: "P0",
    binaries: ["cursor-agent"],
  }),
  adapter({
    id: "copilot",
    label: "GitHub Copilot CLI",
    priority: "P0",
    binaries: ["copilot"],
  }),
  adapter({
    id: "opencode",
    label: "OpenCode",
    priority: "P0",
    binaries: ["opencode"],
  }),
  adapter({
    id: "aider",
    label: "Aider",
    priority: "P1",
    binaries: ["aider"],
  }),
  adapter({
    id: "cline",
    label: "Cline CLI",
    priority: "P1",
    binaries: ["cline"],
  }),
  adapter({
    id: "devin",
    label: "Devin for Terminal",
    priority: "P1",
    binaries: ["devin"],
  }),
  adapter({
    id: "hermes",
    label: "Hermes Agent",
    priority: "P1",
    binaries: ["hermes"],
  }),
  adapter({
    id: "goose",
    label: "Goose",
    priority: "P1",
    binaries: ["goose"],
  }),
  adapter({
    id: "qwen",
    label: "Qwen Code",
    priority: "P1",
    binaries: ["qwen"],
  }),
  adapter({
    id: "grok",
    label: "Grok CLI",
    priority: "P1",
    binaries: ["grok", "grok-dev"],
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
