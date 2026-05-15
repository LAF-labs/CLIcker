import blessed from "blessed";
import type {AgentAdapter} from "../adapters/types.js";
import {createPtySession} from "../core/ptySession.js";

export interface RunTuiOptions {
  adapter: AgentAdapter;
  binary: string;
  args: string[];
  cwd: string;
}

interface ClickContext {
  line: string;
  x: number;
}

interface ClickAction {
  kind: "key" | "text" | "none";
  value?: string;
  label?: string;
}

interface MouseEventLike {
  x: number;
  y: number;
  action?: string;
}

const keySequences: Record<string, string> = {
  enter: "\r",
  return: "\r",
  run: "\r",
  launch: "\r",
  select: "\r",
  send: "\r",
  esc: "\x1b",
  escape: "\x1b",
  reset: "\x1b",
  close: "\x1b",
  clear: "\x1b",
  tab: "\t",
  "shift-tab": "\x1b[Z",
  "s-tab": "\x1b[Z",
  up: "\x1b[A",
  down: "\x1b[B",
  left: "\x1b[D",
  right: "\x1b[C",
  "ctrl+c": "\x03",
  "^c": "\x03",
  "^-c": "\x03",
  cancel: "\x03",
  "ctrl+d": "\x04",
  "^d": "\x04",
  "ctrl+h": "\x08",
  "^h": "\x08",
  "ctrl+q": "\x11",
  "^q": "\x11",
  "^-q": "\x11",
  space: " ",
};

export function runTui(options: RunTuiOptions): void {
  const screen = blessed.screen({
    smartCSR: true,
    title: `CLIcker - ${options.adapter.label}`,
    fullUnicode: true,
    mouse: true,
  });

  const terminal = blessed.terminal({
    parent: screen,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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

  session.process.onData(data => {
    terminal.write(data);
    screen.render();
  });

  session.process.onExit(({exitCode}) => {
    terminal.write(`\r\n[CLIcker] ${options.binary} exited with code ${exitCode}\r\n`);
    screen.render();
  });

  terminal.on("mousedown", (event: MouseEventLike) => {
    terminal.focus();

    if (terminalHasMouseTracking(terminal)) {
      screen.render();
      return;
    }

    const action = resolveClickAction({
      line: getVisibleLineAt(terminal, event.y),
      x: getTerminalColumn(terminal, event.x),
    });

    applyClickAction(action, session.write, screen.render.bind(screen));
  });

  terminal.on("wheeldown", () => {
    if (!terminalHasMouseTracking(terminal)) {
      terminal.scroll(3);
      screen.render();
    }
  });

  terminal.on("wheelup", () => {
    if (!terminalHasMouseTracking(terminal)) {
      terminal.scroll(-3);
      screen.render();
    }
  });

  screen.key(["C-q"], () => {
    quit();
  });

  terminal.key(["C-q"], () => {
    quit();
  });

  screen.on("resize", () => {
    session.resize(getPtyCols(screen.width as number), getPtyRows(screen.height as number));
    terminal.term.resize(getPtyCols(screen.width as number), getPtyRows(screen.height as number));
    screen.render();
  });

  terminal.focus();
  screen.render();
}

function resolveClickAction(context: ClickContext): ClickAction {
  const line = context.line.trimEnd();
  if (line.length === 0) {
    return {kind: "none"};
  }

  const hintAction = resolveHintClick(line, context.x);
  if (hintAction.kind !== "none") {
    return hintAction;
  }

  const optionAction = resolveOptionClick(line);
  if (optionAction.kind !== "none") {
    return optionAction;
  }

  const slashAction = resolveSlashCommandClick(line);
  if (slashAction.kind !== "none") {
    return slashAction;
  }

  return {kind: "none"};
}

function resolveHintClick(line: string, column: number): ClickAction {
  const ranges = findHintRanges(line);
  const hit = ranges.find(range => column >= range.start && column <= range.end);
  if (!hit) {
    return {kind: "none"};
  }

  const sequence = keyToSequence(hit.key);
  return sequence ? {kind: "key", value: sequence, label: hit.key} : {kind: "none"};
}

function findHintRanges(line: string): Array<{start: number; end: number; key: string}> {
  const ranges: Array<{start: number; end: number; key: string}> = [];
  const normalized = line.replaceAll("│", "|");

  const collect = (pattern: RegExp, getKey: (match: RegExpMatchArray) => string): void => {
    for (const match of normalized.matchAll(pattern)) {
      if (match.index === undefined) {
        continue;
      }

      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
        key: getKey(match),
      });
    }
  };

  const keyPattern = "(?:Shift-Tab|Ctrl\\+[A-Za-z]|Enter|Esc|Escape|Tab|Space|Up|Down|Left|Right|\\^[\\-\\w]+)";

  collect(
    new RegExp(`(?:^|[|\\s])(${keyPattern})\\s*[:=]\\s*[^|]+`, "gi"),
    match => match[1] ?? "",
  );
  collect(
    new RegExp(
      `(?:^|[|\\s])(${keyPattern})\\s+(?:send|run|launch|select|close|clear|reset|cancel|home|quit|nav|navigate|scrollback|prompt|normal|comment)`,
      "gi",
    ),
    match => match[1] ?? "",
  );
  collect(/(?:^|[|\s])(Click)\s*:\s*[^|]+/gi, () => "enter");

  return ranges;
}

function resolveOptionClick(line: string): ClickAction {
  const optionMatch = line.match(/^\s*(?:[›>]\s*)?([0-9A-Za-z])\s*(?:[.)]|[({[]?[○●x X✓✔ ]+[)\]}]?)\s+/);
  if (optionMatch?.[1]) {
    return {kind: "text", value: `${optionMatch[1]}\r`, label: optionMatch[1]};
  }

  const checkboxMatch = line.match(/^\s*(?:[-*•]\s*)?(\[[ xX✓✔]\]|\([ xX○●]\))\s+/);
  if (checkboxMatch) {
    return {kind: "key", value: "\r", label: "select"};
  }

  return {kind: "none"};
}

function resolveSlashCommandClick(line: string): ClickAction {
  const commandMatch = line.match(/^\s*(?:[›>]\s*)?(\/[A-Za-z0-9][\w./-]*)\b/);
  if (!commandMatch?.[1]) {
    return {kind: "none"};
  }

  return {kind: "text", value: `${commandMatch[1]} `, label: commandMatch[1]};
}

function applyClickAction(action: ClickAction, write: (data: string) => void, render: () => void): void {
  if (action.kind === "none" || !action.value) {
    render();
    return;
  }

  write(action.value);
  render();
}

function keyToSequence(rawKey: string): string | undefined {
  const key = rawKey
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("control+", "ctrl+");

  return keySequences[key];
}

function getVisibleLineAt(terminal: blessed.Widgets.TerminalElement, absoluteY: number): string {
  const y = Math.max(0, absoluteY - toNumber(terminal.atop) - toNumber(terminal.itop));
  const term = terminal.term;
  const visibleTop = term.ydisp ?? 0;
  const line = term.lines?.[visibleTop + y];

  if (!line) {
    return "";
  }

  return lineToString(line);
}

function lineToString(line: unknown): string {
  if (!Array.isArray(line)) {
    return "";
  }

  return line
    .map(cell => {
      if (Array.isArray(cell)) {
        return String(cell[1] ?? " ");
      }

      if (typeof cell === "string") {
        return cell;
      }

      return " ";
    })
    .join("")
    .trimEnd();
}

function getTerminalColumn(terminal: blessed.Widgets.TerminalElement, absoluteX: number): number {
  return Math.max(0, absoluteX - toNumber(terminal.aleft) - toNumber(terminal.ileft));
}

function terminalHasMouseTracking(terminal: blessed.Widgets.TerminalElement): boolean {
  const term = terminal.term;
  return Boolean(
    term.x10Mouse
      || term.vt200Mouse
      || term.normalMouse
      || term.mouseEvents
      || term.utfMouse
      || term.sgrMouse
      || term.urxvtMouse,
  );
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function getPtyCols(screenWidth: number): number {
  return Math.max(20, screenWidth);
}

function getPtyRows(screenHeight: number): number {
  return Math.max(10, screenHeight);
}
