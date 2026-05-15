import blessed from "blessed";
import type {AgentAdapter} from "../adapters/types.js";
import {createPtySession} from "../core/ptySession.js";

export interface RunTuiOptions {
  adapter: AgentAdapter;
  binary: string;
  args: string[];
  cwd: string;
}

export function runTui(options: RunTuiOptions): void {
  const screen = blessed.screen({
    smartCSR: true,
    title: `CLIcker - ${options.adapter.label}`,
    fullUnicode: true,
    mouse: true,
  });

  const sidebarWidth = 30;

  const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    height: 1,
    width: "100%",
    tags: true,
    content: `{bold}CLIcker{/bold}  Agent: ${options.adapter.label}  Level: ${options.adapter.level}`,
    style: {
      fg: "white",
      bg: "blue",
    },
  });

  const sidebar = blessed.list({
    parent: screen,
    label: " Actions ",
    top: 1,
    left: 0,
    width: sidebarWidth,
    bottom: 3,
    border: "line",
    mouse: true,
    keys: true,
    vi: false,
    tags: true,
    items: options.adapter.actions.map(action => action.label),
    style: {
      selected: {
        bg: "blue",
        fg: "white",
      },
      item: {
        hover: {
          bg: "gray",
        },
      },
    },
  });

  const terminal = blessed.box({
    parent: screen,
    label: ` ${options.binary} `,
    top: 1,
    left: sidebarWidth,
    right: 0,
    bottom: 3,
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
  });

  const input = blessed.textbox({
    parent: screen,
    label: " Prompt ",
    bottom: 0,
    left: 0,
    height: 3,
    width: "100%",
    border: "line",
    inputOnFocus: true,
    mouse: true,
    keys: true,
    style: {
      focus: {
        border: {
          fg: "green",
        },
      },
    },
  });

  const ptyRows = Math.max(10, (screen.height as number) - 6);
  const ptyCols = Math.max(20, (screen.width as number) - sidebarWidth - 2);
  const session = createPtySession({
    command: options.binary,
    args: options.args,
    cwd: options.cwd,
    cols: ptyCols,
    rows: ptyRows,
  });

  session.process.onData(data => {
    terminal.pushLine(data);
    terminal.setScrollPerc(100);
    screen.render();
  });

  session.process.onExit(({exitCode}) => {
    terminal.pushLine(`\n[CLIcker] ${options.binary} exited with code ${exitCode}`);
    screen.render();
  });

  sidebar.on("select", (_item, index) => {
    const action = options.adapter.actions[index];
    if (!action) {
      return;
    }

    session.write(options.adapter.submit(action.value));
    input.focus();
    screen.render();
  });

  input.on("submit", value => {
    if (value.trim().length > 0) {
      session.write(options.adapter.submit(value));
    }

    input.clearValue();
    input.focus();
    screen.render();
  });

  terminal.key(["escape"], () => {
    input.focus();
  });

  screen.key(["C-c"], () => {
    session.kill();
    screen.destroy();
    process.exit(0);
  });

  screen.key(["tab"], () => {
    if (screen.focused === sidebar) {
      input.focus();
    } else {
      sidebar.focus();
    }
    screen.render();
  });

  screen.on("resize", () => {
    const nextRows = Math.max(10, (screen.height as number) - 6);
    const nextCols = Math.max(20, (screen.width as number) - sidebarWidth - 2);
    session.resize(nextCols, nextRows);
    screen.render();
  });

  header.setContent(`{bold}CLIcker{/bold}  Agent: ${options.adapter.label}  Target: ${options.binary}`);
  input.focus();
  screen.render();
}
