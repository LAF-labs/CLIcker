import path from "node:path";
import blessed from "blessed";
import type {AgentAdapter} from "../adapters/types.js";
import {createPtySession} from "../core/ptySession.js";

export interface RunTuiOptions {
  adapter: AgentAdapter;
  binary: string;
  args: string[];
  cwd: string;
}

type ShellMode = "normal" | "plan review" | "always-approve";
type PanelName = "home" | "plan" | "plugins" | "questions" | "subagents";

interface PaletteItem {
  command: string;
  label: string;
  description: string;
  panel?: PanelName;
  prompt?: string;
  mode?: ShellMode;
}

const headerHeight = 3;
const inputHeight = 3;
const footerHeight = 1;
const paletteHeight = 10;

const paletteItems: PaletteItem[] = [
  {
    command: "/plan",
    label: "/plan",
    description: "Open the plan viewer and ask the wrapped CLI to plan before acting.",
    panel: "plan",
    mode: "plan review",
    prompt:
      "Make a plan before editing. Break the work into clear phases, identify files to inspect, risks, and verification. Wait for approval before execution.",
  },
  {
    command: "/review",
    label: "/review",
    description: "Ask for a focused review of the current diff.",
    prompt:
      "Review the current diff for bugs, regressions, missing tests, and maintainability risks. Lead with concrete findings and file references.",
  },
  {
    command: "/btw",
    label: "/btw",
    description: "Ask a side question without changing the main task framing.",
    prompt: "Side question: ",
  },
  {
    command: "/skills",
    label: "/skills",
    description: "Open a Grok Build-style skills browser.",
    panel: "plugins",
  },
  {
    command: "/plugins",
    label: "/plugins",
    description: "Browse hooks, plugins, marketplace, skills, and MCP servers.",
    panel: "plugins",
  },
  {
    command: "/questions",
    label: "/questions",
    description: "Show a multiple-choice clarification panel.",
    panel: "questions",
  },
  {
    command: "/subagents",
    label: "/subagents",
    description: "Open the parallel subagent dashboard.",
    panel: "subagents",
  },
  {
    command: "/approve",
    label: "/approve",
    description: "Switch wrapper status to always-approve display mode.",
    mode: "always-approve",
  },
  {
    command: "/clear",
    label: "/clear",
    description: "Clear the visible transcript while keeping the wrapped CLI running.",
  },
  {
    command: "/quit",
    label: "/quit",
    description: "Quit CLIcker and terminate the wrapped process.",
  },
];

export function runTui(options: RunTuiOptions): void {
  const screen = blessed.screen({
    smartCSR: true,
    title: `CLIcker - ${options.adapter.label}`,
    fullUnicode: true,
    mouse: true,
  });

  let mode: ShellMode = "normal";
  let activePanel: PanelName | null = null;
  let turnCount = 0;
  let outputChars = 0;
  let visiblePaletteItems: PaletteItem[] = [];

  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    height: headerHeight,
    width: "100%",
    tags: true,
    padding: {
      left: 1,
      right: 1,
    },
  });

  const terminal = blessed.terminal({
    parent: screen,
    top: headerHeight,
    left: 0,
    right: 0,
    bottom: inputHeight + footerHeight,
    handler(data: Buffer | string): void {
      session?.write(Buffer.isBuffer(data) ? data.toString("utf8") : data);
    },
    cursor: "block",
    screenKeys: false,
    terminal: process.env.TERM ?? "xterm-256color",
    mouse: true,
    keys: true,
    vi: true,
  });

  const palette = blessed.list({
    parent: screen,
    label: " command palette ",
    bottom: inputHeight + footerHeight,
    left: 2,
    right: 2,
    height: paletteHeight,
    hidden: true,
    border: "line",
    mouse: true,
    keys: true,
    tags: true,
    items: [],
    style: {
      selected: {
        inverse: true,
        bold: true,
      },
    },
  });

  const panel = blessed.box({
    parent: screen,
    top: "center",
    left: "center",
    width: "72%",
    height: "56%",
    hidden: true,
    border: "line",
    tags: true,
    padding: {
      left: 2,
      right: 2,
      top: 1,
      bottom: 1,
    },
  });

  const input = blessed.textbox({
    parent: screen,
    bottom: footerHeight,
    left: 1,
    right: 1,
    height: inputHeight,
    border: "line",
    inputOnFocus: true,
    mouse: true,
    keys: true,
  });

  const footer = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: "100%",
    height: footerHeight,
    tags: true,
  });

  const session = createPtySession({
    command: options.binary,
    args: options.args,
    cwd: options.cwd,
    cols: getPtyCols(screen.width as number),
    rows: getPtyRows(screen.height as number),
  });

  const quit = (): void => {
    session.kill();
    screen.destroy();
    process.exit(0);
  };

  const refreshChrome = (): void => {
    header.setContent(buildHeader(options, mode, turnCount, outputChars));
    input.setLabel(buildInputLabel(options, mode));
    footer.setContent(buildFooter(activePanel));
  };

  const openPanel = (name: PanelName): void => {
    activePanel = name;
    palette.hide();
    panel.setLabel(` ${name} `);
    panel.setContent(buildPanelContent(name, options, mode));
    panel.show();
    refreshChrome();
    screen.render();
  };

  const closePanel = (): void => {
    activePanel = null;
    panel.hide();
    palette.hide();
    input.focus();
    refreshChrome();
    screen.render();
  };

  const showPalette = (): void => {
    const value = input.getValue();
    const query = value.startsWith("/") ? value.slice(1).toLowerCase() : "";
    visiblePaletteItems = paletteItems.filter(item =>
      query.length === 0
        ? true
        : item.command.slice(1).includes(query) || item.description.toLowerCase().includes(query),
    );

    palette.setItems(
      visiblePaletteItems.map(
        item =>
          `{bold}${item.label.padEnd(14)}{/bold} ${item.description}`,
      ),
    );
    palette.show();
    palette.select(0);
    refreshChrome();
    screen.render();
  };

  const hidePalette = (): void => {
    palette.hide();
    refreshChrome();
    screen.render();
  };

  const applyPaletteItem = (item: PaletteItem): void => {
    if (item.command === "/quit") {
      quit();
      return;
    }

    if (item.command === "/clear") {
      terminal.write("\x1b[2J\x1b[H");
      hidePalette();
      input.clearValue();
      input.focus();
      return;
    }

    if (item.mode) {
      mode = item.mode;
    }

    if (item.panel) {
      openPanel(item.panel);
    }

    if (item.prompt) {
      input.setValue(item.prompt);
      input.focus();
    }

    hidePalette();
    refreshChrome();
    screen.render();
  };

  const sendPrompt = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return;
    }

    const matchingCommand = paletteItems.find(item => item.command === trimmed);
    if (matchingCommand) {
      applyPaletteItem(matchingCommand);
      return;
    }

    if (trimmed.startsWith("/")) {
      const command = paletteItems.find(item => trimmed.startsWith(`${item.command} `));
      if (command?.prompt) {
        session.write(`${command.prompt}${trimmed.slice(command.command.length).trim()}\r`);
        turnCount += 1;
        return;
      }
    }

    session.write(`${value}\r`);
    turnCount += 1;
  };

  session.process.onData(data => {
    outputChars += data.length;
    terminal.write(data);
    refreshChrome();
    screen.render();
  });

  session.process.onExit(({exitCode}) => {
    terminal.write(`\r\n[CLIcker] ${options.binary} exited with code ${exitCode}\r\n`);
    refreshChrome();
    footer.setContent(` ${options.binary} exited with code ${exitCode} | ^-q quit `);
    screen.render();
  });

  input.on("submit", value => {
    sendPrompt(value);
    input.clearValue();
    hidePalette();
    input.focus();
    refreshChrome();
    screen.render();
  });

  input.on("keypress", () => {
    setTimeout(() => {
      const value = input.getValue();
      if (value.startsWith("/")) {
        showPalette();
      } else if (!palette.hidden) {
        hidePalette();
      }
    }, 0);
  });

  palette.on("select", (_item, index) => {
    const item = visiblePaletteItems[index];
    if (item) {
      applyPaletteItem(item);
    }
  });

  terminal.on("mousedown", () => {
    terminal.focus();
    refreshChrome();
    screen.render();
  });

  screen.key(["C-q"], () => {
    quit();
  });

  for (const element of [terminal, input, palette, panel]) {
    element.key(["C-q"], () => {
      quit();
    });
  }

  screen.key(["C-c"], () => {
    session.write("\x03");
    refreshChrome();
    screen.render();
  });

  screen.key(["escape"], () => {
    if (activePanel || !palette.hidden) {
      closePanel();
      return;
    }

    input.clearValue();
    input.focus();
    refreshChrome();
    screen.render();
  });

  screen.key(["tab"], () => {
    if (palette.hidden) {
      showPalette();
      palette.focus();
    } else {
      palette.down(1);
    }
    screen.render();
  });

  screen.key(["S-tab"], () => {
    mode = mode === "normal" ? "plan review" : "normal";
    refreshChrome();
    screen.render();
  });

  screen.key(["C-h"], () => {
    openPanel("home");
  });

  screen.on("resize", () => {
    session.resize(getPtyCols(screen.width as number), getPtyRows(screen.height as number));
    terminal.term.resize(getPtyCols(screen.width as number), getPtyRows(screen.height as number));
    refreshChrome();
    screen.render();
  });

  refreshChrome();
  input.focus();
  screen.render();
}

function buildHeader(options: RunTuiOptions, mode: ShellMode, turns: number, outputChars: number): string {
  const cwdName = path.basename(options.cwd);
  const progress = Math.min(99.9, outputChars / 800).toFixed(2);
  const target = [options.binary, ...options.args].join(" ");

  return [
    `${cwdName}/main  ${target}{|}${turns} ↵  ${progress}%│`,
    "",
    `{bold}›{/bold} ${options.adapter.label}    CLIcker · grok-build-style · ${mode}`,
  ].join("\n");
}

function buildInputLabel(options: RunTuiOptions, mode: ShellMode): string {
  return ` ›  ${options.adapter.id} · ${mode} `;
}

function buildFooter(activePanel: PanelName | null): string {
  if (activePanel) {
    return " Esc close | Tab command palette | Ctrl+H home | ^-q quit ";
  }

  return " Enter send | Shift-Tab normal/plan | Tab commands | Ctrl+H home | ^-q quit ";
}

function buildPanelContent(name: PanelName, options: RunTuiOptions, mode: ShellMode): string {
  switch (name) {
    case "home":
      return [
        "{bold}CLIcker Home{/bold}",
        "",
        `Wrapped CLI: ${options.adapter.label}`,
        `Mode: ${mode}`,
        "",
        "Type / to open commands. Use /plan, /plugins, /questions, or /subagents.",
        "The wrapped CLI still runs unchanged behind this Grok Build-style shell.",
      ].join("\n");
    case "plan":
      return [
        "{bold}plan.md{/bold}",
        "",
        "1 Design the change as a reviewable plan",
        "2 Inspect repository conventions before editing",
        "3 List files, risks, and verification commands",
        "4 Ask the wrapped CLI to execute only after approval",
        "",
        "Enter comment | j/k nav | V select | Ctrl+Enter finalize | Esc close",
      ].join("\n");
    case "plugins":
      return [
        "{bold}Hooks   Plugins   Marketplace   Skills   MCP Servers{/bold}",
        "",
        "› browser-review        (community)",
        "› code-review           (local)",
        "› make-interfaces-feel-better  (user)",
        "› project-conventions   (local)",
        "› pr-summary            (local)",
        "",
        "/ search | Space expand | Tab tab | Esc close",
      ].join("\n");
    case "questions":
      return [
        "{bold}Waiting on answers for 3 questions{/bold}",
        "",
        "What interaction should CLIcker prioritize?",
        "1 (○) Grok Build-style shell",
        "2 (○) Thin terminal passthrough",
        "3 (○) Hybrid with custom commands",
        "z (○) Type your answer here",
        "",
        "[1/3] ↑/↓ navigate · ←/→ question · Enter select",
      ].join("\n");
    case "subagents":
      return [
        "{bold}4 agents ↳{/bold}",
        "",
        "· general   Review CLI wrapper architecture",
        "· explore   Inspect wrapped CLI capabilities",
        "· explore   Map command palette opportunities",
        "· general   Verify terminal rendering",
        "",
        "Subagents are represented in the shell UI first; execution can be backed by the wrapped CLI later.",
      ].join("\n");
  }
}

function getPtyCols(screenWidth: number): number {
  return Math.max(20, screenWidth);
}

function getPtyRows(screenHeight: number): number {
  return Math.max(10, screenHeight - headerHeight - inputHeight - footerHeight);
}
