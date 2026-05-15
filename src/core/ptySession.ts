import os from "node:os";
import process from "node:process";
import pty from "node-pty";

export interface PtySessionOptions {
  command: string;
  args: string[];
  cwd: string;
  cols: number;
  rows: number;
}

export interface PtySession {
  process: pty.IPty;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export function createPtySession(options: PtySessionOptions): PtySession {
  const shellEnv = {
    ...process.env,
    TERM: process.env.TERM ?? "xterm-256color",
    COLORTERM: process.env.COLORTERM ?? "truecolor",
  };

  const ptyProcess = pty.spawn(options.command, options.args, {
    name: shellEnv.TERM,
    cols: options.cols,
    rows: options.rows,
    cwd: options.cwd,
    env: shellEnv as Record<string, string>,
    encoding: "utf8",
    useConpty: os.platform() === "win32",
  });

  return {
    process: ptyProcess,
    write(data: string): void {
      ptyProcess.write(data);
    },
    resize(cols: number, rows: number): void {
      ptyProcess.resize(cols, rows);
    },
    kill(): void {
      ptyProcess.kill();
    },
  };
}
