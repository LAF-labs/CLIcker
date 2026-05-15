export type AdapterLevel = "L0_DETECT" | "L1_CLICK";

export interface AgentAdapter {
  id: string;
  label: string;
  level: AdapterLevel;
  priority: "P0" | "P1" | "P2" | "GENERIC";
  binaries: string[];
  defaultArgs?: string[];
}

export interface ResolvedAdapter {
  adapter: AgentAdapter;
  binary: string;
}
