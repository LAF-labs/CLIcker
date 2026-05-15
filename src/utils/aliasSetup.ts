import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {listAdapters} from "../adapters/registry.js";

export interface AliasSetupOptions {
  dryRun?: boolean;
  remove?: boolean;
  shell?: string;
}

const startMarker = "# >>> CLIcker aliases >>>";
const endMarker = "# <<< CLIcker aliases <<<";

export function resolveShellRc(shellName = path.basename(process.env.SHELL ?? "zsh")): string {
  const home = os.homedir();

  switch (shellName) {
    case "bash":
      return path.join(home, ".bashrc");
    case "fish":
      return path.join(home, ".config", "fish", "config.fish");
    case "zsh":
    default:
      return path.join(home, ".zshrc");
  }
}

export function buildAliasBlock(shellName = path.basename(process.env.SHELL ?? "zsh")): string {
  const adapters = listAdapters().filter(adapter => adapter.priority === "P0" || adapter.priority === "P1");

  const aliases = adapters.flatMap(adapter =>
    adapter.binaries.map(binary => {
      if (shellName === "fish") {
        return `alias ${binary} 'clicker ${binary}'`;
      }

      return `alias ${binary}='clicker ${binary}'`;
    }),
  );

  return [startMarker, ...aliases, endMarker].join("\n");
}

export function updateAliases(options: AliasSetupOptions): string {
  const shellName = options.shell ?? path.basename(process.env.SHELL ?? "zsh");
  const rcPath = resolveShellRc(shellName);
  const existing = fs.existsSync(rcPath) ? fs.readFileSync(rcPath, "utf8") : "";
  const withoutBlock = removeAliasBlock(existing);
  const next = options.remove ? withoutBlock : appendBlock(withoutBlock, buildAliasBlock(shellName));

  if (options.dryRun) {
    return next;
  }

  fs.mkdirSync(path.dirname(rcPath), {recursive: true});
  fs.writeFileSync(rcPath, next);
  return rcPath;
}

function removeAliasBlock(input: string): string {
  const start = input.indexOf(startMarker);
  const end = input.indexOf(endMarker);

  if (start === -1 || end === -1 || end < start) {
    return input;
  }

  return `${input.slice(0, start).trimEnd()}\n${input.slice(end + endMarker.length).trimStart()}`.trimEnd() + "\n";
}

function appendBlock(input: string, block: string): string {
  const prefix = input.trimEnd();
  return `${prefix}${prefix.length > 0 ? "\n\n" : ""}${block}\n`;
}
