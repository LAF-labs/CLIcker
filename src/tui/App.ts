import path from "node:path";
import blessed from "blessed";
import type {AgentAdapter} from "../adapters/types.js";
import type {PtySession} from "../core/ptySession.js";
import {createPtySession} from "../core/ptySession.js";

export interface RunTuiOptions {
  adapter: AgentAdapter;
  binary: string;
  args: string[];
  cwd: string;
}

interface TouchAction {
  id: string;
  label: string;
  description: string;
  run(context: TouchContext): void;
}

interface TouchContext {
  screen: blessed.Widgets.Screen;
  sidebar: blessed.Widgets.ListElement;
  terminal: blessed.Widgets.BoxElement;
  input: blessed.Widgets.TextboxElement;
  footer: blessed.Widgets.BoxElement;
  session: PtySession;
  quit(): void;
}

const sidebarWidth = 28;
const headerHeight = 3;
const inputHeight = 3;
const footerHeight = 1;
const detailHeight = 6;
const enter = "\r";

const touchActions: TouchAction[] = [
  {
    id: "focus-terminal",
    label: "Focus terminal",
    description: "Return keyboard focus to the wrapped CLI.",
    run: ({terminal, footer, screen}) => {
      terminal.focus();
      footer.setContent(" Terminal focused  |  Keyboard goes directly to the CLI ");
      screen.render();
    },
  },
  {
    id: "focus-prompt",
    label: "Prompt box",
    description: "Type text in CLIcker, then send it to the CLI with Enter.",
    run: ({input, footer, screen}) => {
      input.focus();
      footer.setContent(" Prompt box focused  |  Enter sends text to the CLI ");
      screen.render();
    },
  },
  {
    id: "enter",
    label: "Enter",
    description: "Send Enter to the wrapped CLI.",
    run: context => sendKey(context, enter, "Enter"),
  },
  {
    id: "escape",
    label: "Escape",
    description: "Send Escape to the wrapped CLI.",
    run: context => sendKey(context, "\x1b", "Escape"),
  },
  {
    id: "tab",
    label: "Tab",
    description: "Send Tab to the wrapped CLI.",
    run: context => sendKey(context, "\t", "Tab"),
  },
  {
    id: "up",
    label: "Up",
    description: "Send the Up arrow key.",
    run: context => sendKey(context, "\x1b[A", "Up"),
  },
  {
    id: "down",
    label: "Down",
    description: "Send the Down arrow key.",
    run: context => sendKey(context, "\x1b[B", "Down"),
  },
  {
    id: "left",
    label: "Left",
    description: "Send the Left arrow key.",
    run: context => sendKey(context, "\x1b[D", "Left"),
  },
  {
    id: "right",
    label: "Right",
    description: "Send the Right arrow key.",
    run: context => sendKey(context, "\x1b[C", "Right"),
  },
  {
    id: "ctrl-c",
    label: "Ctrl+C",
    description: "Interrupt the wrapped CLI without closing CLIcker.",
    run: context => sendKey(context, "\x03", "Ctrl+C"),
  },
  {
    id: "ctrl-d",
    label: "Ctrl+D",
    description: "Send EOF to the wrapped CLI.",
    run: context => sendKey(context, "\x04", "Ctrl+D"),
  },
  {
    id: "ctrl-l",
    label: "Ctrl+L",
    description: "Ask the wrapped CLI to clear or redraw its own screen.",
    run: context => sendKey(context, "\x0c", "Ctrl+L"),
  },
  {
    id: "clear-view",
    label: "Clear view",
    description: "Clear only CLIcker's viewport. The wrapped CLI keeps running.",
    run: ({terminal, footer, screen}) => {
      terminal.setContent("");
      footer.setContent(" View cleared  |  Wrapped CLI is still running ");
      screen.render();
    },
  },
  {
    id: "quit",
    label: "Quit wrapper",
    description: "Close CLIcker and terminate the wrapped CLI process.",
    run: ({quit}) => {
      quit();
    },
  },
];

export function runTui(options: RunTuiOptions): void {
  const screen = blessed.screen({
    smartCSR: true,
    title: `CLIcker - ${options.adapter.label}`,
    fullUnicode: true,
    mouse: true,
  });

  let selectedAction = touchActions[0];

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
    content: buildHeader(options),
    style: {
      fg: "white",
      bg: "black",
    },
  });

  const sidebar = blessed.list({
    parent: screen,
    label: " Touch ",
    top: headerHeight,
    left: 0,
    width: sidebarWidth,
    bottom: inputHeight + footerHeight + detailHeight,
    border: "line",
    mouse: true,
    keys: true,
    vi: false,
    items: touchActions.map(action => action.label),
    style: {
      border: {
        fg: "cyan",
      },
      selected: {
        bg: "cyan",
        fg: "black",
        bold: true,
      },
      item: {
        hover: {
          bg: "gray",
          fg: "black",
        },
      },
    },
  });

  const details = blessed.box({
    parent: screen,
    label: " Button ",
    left: 0,
    width: sidebarWidth,
    bottom: inputHeight + footerHeight,
    height: detailHeight,
    border: "line",
    padding: {
      left: 1,
      right: 1,
    },
    content: buildActionDetails(selectedAction),
    style: {
      border: {
        fg: "yellow",
      },
    },
  });

  const terminal = blessed.box({
    parent: screen,
    label: ` ${options.binary} `,
    top: headerHeight,
    left: sidebarWidth,
    right: 0,
    bottom: inputHeight + footerHeight,
    border: "line",
    tags: false,
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "gray",
      },
      style: {
        bg: "white",
      },
    },
    style: {
      border: {
        fg: "green",
      },
      focus: {
        border: {
          fg: "cyan",
        },
      },
    },
  });

  const input = blessed.textbox({
    parent: screen,
    label: " Send Text ",
    bottom: footerHeight,
    left: 0,
    height: inputHeight,
    width: "100%",
    border: "line",
    inputOnFocus: true,
    mouse: true,
    keys: true,
    style: {
      border: {
        fg: "white",
      },
      focus: {
        border: {
          fg: "green",
        },
      },
    },
  });

  const footer = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    height: footerHeight,
    width: "100%",
    content: " Thin touch layer  |  Click buttons or type directly  |  Ctrl+Q quits CLIcker ",
    style: {
      fg: "black",
      bg: "white",
    },
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

  const context: TouchContext = {
    screen,
    sidebar,
    terminal,
    input,
    footer,
    session,
    quit,
  };

  session.process.onData(data => {
    terminal.pushLine(data);
    terminal.setScrollPerc(100);
    screen.render();
  });

  session.process.onExit(({exitCode}) => {
    terminal.pushLine(`\n[CLIcker] ${options.binary} exited with code ${exitCode}`);
    footer.setContent(` ${options.binary} exited with code ${exitCode}  |  Ctrl+Q quits CLIcker `);
    screen.render();
  });

  sidebar.on("select", (_item, index) => {
    const action = touchActions[index];
    if (!action) {
      return;
    }

    selectedAction = action;
    details.setContent(buildActionDetails(action));
    action.run(context);
  });

  sidebar.on("select item", (_item, index) => {
    const action = touchActions[index];
    if (action) {
      selectedAction = action;
      details.setContent(buildActionDetails(action));
      screen.render();
    }
  });

  terminal.on("click", () => {
    terminal.focus();
    screen.render();
  });

  terminal.on("keypress", (ch, key) => {
    const sequence = key?.sequence ?? ch;
    if (typeof sequence === "string" && sequence.length > 0) {
      session.write(sequence);
    }
  });

  input.on("submit", value => {
    if (value.length > 0) {
      session.write(`${value}${enter}`);
      footer.setContent(" Text sent to wrapped CLI ");
    }

    input.clearValue();
    terminal.focus();
    screen.render();
  });

  screen.key(["C-c"], () => {
    sendKey(context, "\x03", "Ctrl+C");
  });

  screen.key(["C-q"], () => {
    quit();
  });

  screen.key(["tab"], () => {
    if (screen.focused === terminal) {
      sidebar.focus();
    } else if (screen.focused === sidebar) {
      input.focus();
    } else {
      terminal.focus();
    }
    screen.render();
  });

  screen.on("resize", () => {
    session.resize(getPtyCols(screen.width as number), getPtyRows(screen.height as number));
    header.setContent(buildHeader(options));
    screen.render();
  });

  terminal.focus();
  screen.render();
}

function sendKey(context: TouchContext, sequence: string, label: string): void {
  context.session.write(sequence);
  context.footer.setContent(` Sent ${label} to wrapped CLI `);
  context.terminal.focus();
  context.screen.render();
}

function buildHeader(options: RunTuiOptions): string {
  const cwdName = path.basename(options.cwd);
  const argText = options.args.length > 0 ? ` ${options.args.join(" ")}` : "";

  return [
    `{cyan-fg}{bold}CLIcker{/bold}{/cyan-fg}  ${options.adapter.label}  {yellow-fg}${options.adapter.priority}{/yellow-fg}  ${options.adapter.level}`,
    `{gray-fg}${options.binary}${argText}  |  cwd: ${cwdName}  |  touch controls only{/gray-fg}`,
  ].join("\n");
}

function buildActionDetails(action: TouchAction): string {
  return [`${action.label}`, "", action.description].join("\n");
}

function getPtyCols(screenWidth: number): number {
  return Math.max(20, screenWidth - sidebarWidth - 2);
}

function getPtyRows(screenHeight: number): number {
  return Math.max(10, screenHeight - headerHeight - inputHeight - footerHeight - 2);
}
