#!/usr/bin/env node
import process from "node:process";
import {Command} from "commander";
import {config} from "./config.js";
import {listAdapters, resolveAdapter} from "./adapters/registry.js";
import {runTui} from "./tui/App.js";
import {updateAliases} from "./utils/aliasSetup.js";

const program = new Command();

program
  .name("clicker")
  .description("CLIcker: clickable PTY wrapper for terminal AI coding agents")
  .version("0.1.0")
  .allowUnknownOption(true)
  .allowExcessArguments(true);

program
  .command("adapters")
  .description("List built-in agent adapters")
  .action(() => {
    for (const adapter of listAdapters()) {
      console.log(`${adapter.priority}\t${adapter.level}\t${adapter.id}\t${adapter.binaries.join(", ")}\t${adapter.label}`);
    }
  });

program
  .command("setup")
  .description("Install or remove shell aliases for supported agents")
  .option("--dry-run", "Print the resulting shell rc content instead of writing")
  .option("--remove", "Remove CLIcker alias block")
  .option("--shell <shell>", "Shell to configure: zsh, bash, or fish")
  .action((options: {dryRun?: boolean; remove?: boolean; shell?: string}) => {
    const result = updateAliases(options);
    console.log(options.dryRun ? result : `Updated ${result}`);
  });

program
  .command("config")
  .description("Print CLIcker config path and values")
  .action(() => {
    console.log(`Config path: ${config.path}`);
    console.log(JSON.stringify(config.store, null, 2));
  });

program
  .argument("[target]", "Agent command to wrap")
  .argument("[args...]", "Arguments passed to the target agent")
  .action((target: string | undefined, args: string[]) => {
    const selectedTarget = target ?? config.get("defaultTarget");

    if (!selectedTarget) {
      program.help();
      return;
    }

    const resolved = resolveAdapter(selectedTarget);
    runTui({
      adapter: resolved.adapter,
      binary: resolved.binary,
      args,
      cwd: process.cwd(),
    });
  });

program.parse(process.argv);
