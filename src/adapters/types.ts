export type AdapterLevel =
  | "L0_DETECT"
  | "L1_INJECT"
  | "L2_COMMANDS"
  | "L3_PARSE"
  | "L4_PROTOCOL";

export type AdapterActionKind = "prompt" | "command";

export interface AdapterAction {
  id: string;
  label: string;
  description: string;
  kind: AdapterActionKind;
  value: string;
}

export interface AgentAdapter {
  id: string;
  label: string;
  level: AdapterLevel;
  priority: "P0" | "P1" | "P2" | "GENERIC";
  binaries: string[];
  defaultArgs?: string[];
  actions: AdapterAction[];
  submit(text: string): string;
}

export interface ResolvedAdapter {
  adapter: AgentAdapter;
  binary: string;
}
