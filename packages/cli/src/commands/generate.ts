import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import chalk from "chalk";
import { generatePrompt } from "../generator/prompt.js";
import { IncidentStatus, type Incident } from "../shared/types.js";

const INCIDENTS_DIR = ".chrome2code/incidents";
const PROMPTS_DIR = "prompts";

function readIncident(filePath: string): Incident {
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Incident;
}

function updateIncidentStatus(filePath: string, incident: Incident): void {
  incident.status = IncidentStatus.PROMPTED;
  writeFileSync(filePath, JSON.stringify(incident, null, 2), "utf-8");
}

export function generateCommand(name: string | undefined, options: { force: boolean }): void {
  const cwd = process.cwd();
  const incidentsDir = join(cwd, INCIDENTS_DIR);
  const promptsDir = join(cwd, PROMPTS_DIR);

  if (!existsSync(incidentsDir)) {
    console.error(chalk.red(`No ${INCIDENTS_DIR}/ directory found. Run "chrome2code init" first.`));
    process.exit(1);
  }

  if (!existsSync(promptsDir)) {
    console.error(chalk.red(`No ${PROMPTS_DIR}/ directory found. Run "chrome2code init" first.`));
    process.exit(1);
  }

  // Find incident files
  let files: string[];
  if (name) {
    const candidates = [
      `${name}.json`,
      name.endsWith(".json") ? name : null,
    ].filter(Boolean) as string[];

    const found = candidates.find((f) => existsSync(join(incidentsDir, f)));
    if (!found) {
      console.error(chalk.red(`Incident "${name}" not found in ${INCIDENTS_DIR}/`));
      process.exit(1);
    }
    files = [found];
  } else {
    files = readdirSync(incidentsDir).filter((f) => f.endsWith(".json"));
  }

  if (files.length === 0) {
    console.log(chalk.gray("No incident files found in .chrome2code/incidents/"));
    return;
  }

  let generated = 0;
  let skipped = 0;

  for (const file of files) {
    const incidentPath = join(incidentsDir, file);
    const incident = readIncident(incidentPath);
    const promptId = incident.id || basename(file, ".json");
    const promptPath = join(promptsDir, `${promptId}.prompt.md`);

    if (existsSync(promptPath) && !options.force) {
      console.log(chalk.yellow(`  skipped ${promptId}.prompt.md (exists, use --force to overwrite)`));
      skipped++;
      continue;
    }

    const prompt = generatePrompt(incident);
    writeFileSync(promptPath, prompt, "utf-8");
    updateIncidentStatus(incidentPath, incident);
    console.log(chalk.green(`  generated ${promptId}.prompt.md`));
    generated++;
  }

  console.log(
    `\n${chalk.green(`${generated} prompt(s) generated`)}${skipped > 0 ? chalk.yellow(`, ${skipped} skipped`) : ""}`,
  );

  if (generated > 0) {
    console.log(chalk.gray(`\nRun a prompt with Claude Code:`));
    console.log(chalk.cyan(`  claude "$(cat prompts/<incident-id>.prompt.md)"`));
  }
}
