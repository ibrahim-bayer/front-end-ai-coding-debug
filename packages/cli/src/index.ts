import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { generateCommand } from "./commands/generate.js";
import { listCommand } from "./commands/list.js";
import { resolveCommand } from "./commands/resolve.js";

const program = new Command();

program
  .name("chrome2code")
  .description("Generate Claude Code fix prompts from browser incident captures")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize .chrome2code/incidents/ and prompts/ directories")
  .action(initCommand);

program
  .command("generate")
  .description("Generate prompt files from incident JSON files")
  .argument("[name]", "specific incident name to generate")
  .option("-f, --force", "overwrite existing prompt files", false)
  .action(generateCommand);

program
  .command("list")
  .alias("ls")
  .description("List all incidents with their status")
  .action(listCommand);

program
  .command("resolve")
  .description("Mark an incident as resolved")
  .argument("<name>", "incident name or id to resolve")
  .action(resolveCommand);

program.parse();
