import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import chalk from "chalk";
import type { Incident } from "../shared/types.js";

const INCIDENTS_DIR = ".chrome2code/incidents";

const STATUS_COLORS: Record<string, (text: string) => string> = {
  new: chalk.cyan,
  prompted: chalk.yellow,
  resolved: chalk.green,
};

export function listCommand(): void {
  const cwd = process.cwd();
  const incidentsDir = join(cwd, INCIDENTS_DIR);

  if (!existsSync(incidentsDir)) {
    console.error(chalk.red(`No ${INCIDENTS_DIR}/ directory found. Run "chrome2code init" first.`));
    process.exit(1);
  }

  const files = readdirSync(incidentsDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log(chalk.gray("No incidents found."));
    return;
  }

  console.log(chalk.bold(`\n  Incidents (${files.length})\n`));

  for (const file of files) {
    const filePath = join(incidentsDir, file);
    const raw = readFileSync(filePath, "utf-8");
    const incident = JSON.parse(raw) as Incident;
    const id = incident.id || basename(file, ".json");
    const status = incident.status ?? "new";
    const colorFn = STATUS_COLORS[status] ?? chalk.gray;
    const time = new Date(incident.timestamp).toLocaleString();

    console.log(
      `  ${colorFn(`[${status.toUpperCase().padEnd(8)}]`)} ${chalk.bold(id)}`,
    );
    console.log(
      `             ${chalk.gray(incident.url)} — ${chalk.gray(time)}`,
    );
    console.log(
      `             ${incident.errors.length} errors · ${incident.network.length} network · ${incident.actions.length} actions`,
    );
    console.log();
  }
}
