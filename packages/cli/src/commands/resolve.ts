import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import chalk from "chalk";
import { IncidentStatus, type Incident } from "../shared/types.js";

const INCIDENTS_DIR = ".chrome2code/incidents";

export function resolveCommand(name: string): void {
  const cwd = process.cwd();
  const incidentsDir = join(cwd, INCIDENTS_DIR);

  if (!existsSync(incidentsDir)) {
    console.error(chalk.red(`No ${INCIDENTS_DIR}/ directory found. Run "chrome2code init" first.`));
    process.exit(1);
  }

  // Find the incident file by name or id
  const files = readdirSync(incidentsDir).filter((f) => f.endsWith(".json"));
  let targetFile: string | undefined;

  // Try direct filename match first
  const directMatch = `${name}.json`;
  if (files.includes(directMatch)) {
    targetFile = directMatch;
  } else if (files.includes(name)) {
    targetFile = name;
  } else {
    // Search by incident id inside the files
    for (const file of files) {
      const filePath = join(incidentsDir, file);
      const raw = readFileSync(filePath, "utf-8");
      const incident = JSON.parse(raw) as Incident;
      if (incident.id === name) {
        targetFile = file;
        break;
      }
    }
  }

  if (!targetFile) {
    console.error(chalk.red(`Incident "${name}" not found.`));
    process.exit(1);
  }

  const filePath = join(incidentsDir, targetFile);
  const raw = readFileSync(filePath, "utf-8");
  const incident = JSON.parse(raw) as Incident;
  const id = incident.id || basename(targetFile, ".json");

  if (incident.status === IncidentStatus.RESOLVED) {
    console.log(chalk.gray(`Incident "${id}" is already resolved.`));
    return;
  }

  incident.status = IncidentStatus.RESOLVED;
  writeFileSync(filePath, JSON.stringify(incident, null, 2), "utf-8");
  console.log(chalk.green(`Incident "${id}" marked as resolved.`));
}
