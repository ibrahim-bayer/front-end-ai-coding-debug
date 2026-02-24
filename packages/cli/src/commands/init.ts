import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";

const DIRS = [".chrome2code/incidents", "prompts"];

export function initCommand(): void {
  const cwd = process.cwd();
  let created = 0;

  for (const dir of DIRS) {
    const fullPath = join(cwd, dir);
    if (existsSync(fullPath)) {
      console.log(chalk.gray(`  exists ${dir}/`));
    } else {
      mkdirSync(fullPath, { recursive: true });
      console.log(chalk.green(`  created ${dir}/`));
      created++;
    }
  }

  if (created > 0) {
    console.log(chalk.green(`\nChrome2Code initialized. Drop incident JSON files into .chrome2code/incidents/`));
  } else {
    console.log(chalk.gray("\nAlready initialized."));
  }
}
