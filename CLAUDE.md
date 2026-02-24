# Chrome2Code

## Project Overview

Chrome2Code is a development tool with two components:
1. **Chrome Extension** — Captures browser errors, network failures, user actions, and console logs during development. Exports incident data as JSON.
2. **CLI Tool** — Reads incident JSON files and generates structured prompt markdown files that developers run with Claude Code to fix issues.
3. **Subagents** - Developer subagent will be automatically invoked for all coding activities.

See `roadmap.md` for full architecture and development phases.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 20+
- **Package manager:** npm
- **Chrome Extension:** Manifest V3
- **CLI:** Node.js with commander.js
- **Build:**
  - Extension: WXT framework (v0.20+) — file-based entrypoints, auto-generated manifest
  - CLI: tsup for bundling

## Monorepo Structure

```
chrome2code/
├── CLAUDE.md
├── roadmap.md
├── packages/
│   ├── extension/              # Chrome extension (WXT project)
│   │   ├── entrypoints/        # WXT file-based entrypoints (auto-generates manifest)
│   │   │   ├── background/     # Service worker
│   │   │   │   └── index.ts    # Network capture, message hub
│   │   │   ├── content.ts      # Content script: clicks, inputs, navigation
│   │   │   ├── popup/          # Extension popup
│   │   │   │   ├── index.html
│   │   │   │   ├── main.ts     # Start/stop, view incidents, export
│   │   │   │   └── style.css
│   │   │   ├── devtools.html   # DevTools entry (creates panel)
│   │   │   └── devtools-panel/ # DevTools panel (unlisted page)
│   │   │       ├── index.html
│   │   │       ├── main.ts     # Console errors, logs, incident viewer
│   │   │       └── style.css
│   │   ├── lib/                # Shared library code
│   │   │   ├── types.ts        # Incident, Action, ErrorEntry, NetworkEntry
│   │   │   ├── buffer.ts       # Rolling action buffer (30 events)
│   │   │   └── messages.ts     # Message types for extension communication
│   │   ├── public/             # Static assets
│   │   │   └── icon/
│   │   │       ├── 16.png
│   │   │       ├── 48.png
│   │   │       └── 128.png
│   │   ├── wxt.config.ts       # WXT configuration
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── cli/                    # CLI tool
│       ├── src/
│       │   ├── index.ts        # Entry point, commander setup
│       │   ├── commands/
│       │   │   ├── init.ts     # chrome2code init
│       │   │   ├── generate.ts # chrome2code generate [name]
│       │   │   ├── list.ts     # chrome2code list
│       │   │   └── resolve.ts  # chrome2code resolve <name>
│       │   ├── generator/
│       │   │   └── prompt.ts   # Prompt template engine
│       │   └── shared/
│       │       └── types.ts    # Shared types (same as extension)
│       ├── tsup.config.ts
│       ├── tsconfig.json
│       └── package.json
├── package.json                # Workspace root
└── tsconfig.base.json          # Shared TS config
```

## Coding Conventions

### TypeScript
- Strict mode enabled, no `any` types
- Use interfaces over type aliases for object shapes
- Use enums for fixed sets (action types, incident status)
- Explicit return types on exported functions
- No default exports — use named exports everywhere

### Naming
- Files: kebab-case (`rolling-buffer.ts`)
- Interfaces: PascalCase with `I` prefix omitted (`Incident`, not `IIncident`)
- Enums: PascalCase, members UPPER_SNAKE_CASE (`ActionType.CLICK`)
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE

### Chrome Extension Specifics (WXT Framework)
- Built with WXT (v0.20+) — file-based entrypoints, manifest auto-generated
- Use `defineBackground()`, `defineContentScript()` from WXT
- Use `browser.*` API (WXT polyfill) instead of `chrome.*` for cross-browser compat
- Content scripts must be minimal — capture events, send via `browser.runtime.sendMessage`
- Background service worker is the message hub — aggregates data from content scripts and devtools
- Use `browser.storage.local` for incident data persistence
- Shared code goes in `lib/` directory (not `entrypoints/`)
- Extension permissions must be minimal — only request what's needed
- No default exports except WXT entrypoint definitions (defineBackground, defineContentScript)

### CLI Specifics
- Use commander.js for argument parsing
- Exit codes: 0 success, 1 error
- Colorized output with chalk
- All file paths relative to project root (where user runs the command)
- Incident files read from `.chrome2code/incidents/`
- Prompt files written to `prompts/`
- Never overwrite existing prompt files without `--force` flag

### Error Handling
- CLI: catch errors at command level, print user-friendly message, exit 1
- Extension: catch errors silently in content scripts (must not break the inspected page)
- Never throw in content scripts — log and fail gracefully

### Testing
- Vitest for both packages
- Extension: test buffer logic, message formatting, JSON export
- CLI: test prompt generation, file I/O, command parsing
- No E2E browser tests for MVP

## Incident JSON Schema

The shared contract between extension and CLI:

```typescript
interface Incident {
  id: string;                    // kebab-case identifier
  url: string;                   // Page URL where error occurred
  timestamp: string;             // ISO 8601
  actions: Action[];             // User actions leading to error
  errors: ErrorEntry[];          // Console errors captured
  network: NetworkEntry[];       // Failed network requests
  console_logs: string[];        // Console.log output
  notes?: string;                // Optional developer notes
  status?: "new" | "prompted" | "resolved";
}

interface Action {
  type: "click" | "input" | "navigate" | "scroll" | "submit";
  timestamp: string;
  target?: string;               // CSS selector
  text?: string;                 // Element text content
  from?: string;                 // Navigation: previous URL
  to?: string;                   // Navigation: new URL
  field?: string;                // Input: field name
}

interface ErrorEntry {
  message: string;
  stack?: string;
  type: string;                  // "TypeError", "ReferenceError", etc.
  timestamp: string;
}

interface NetworkEntry {
  method: string;
  url: string;
  status: number;
  statusText?: string;
  response?: string;             // Response body (truncated to 1KB)
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  timestamp: string;
  duration?: number;             // ms
}
```

## Prompt Generation Rules

- One prompt file per incident
- Filename matches incident ID: `incident-id.prompt.md`
- Prompt structure: Error first, then actions, then network, then logs
- Include route/URL prominently — it helps Claude Code locate relevant code
- Stack traces must be preserved exactly as captured
- Network request/response bodies truncated to 1KB
- Developer notes included verbatim at the end
- Task section at the bottom must be actionable and specific

## Commands Reference

```
chrome2code init              # Setup .chrome2code/ and prompts/ dirs
chrome2code generate          # Generate prompts for all new incidents
chrome2code generate <name>   # Generate prompt for specific incident
chrome2code list              # List incidents with status
chrome2code resolve <name>    # Mark incident as resolved
```

## Current Phase

Phase 1 — MVP. Focus on Chrome extension capture and CLI prompt generation. No server, no auth, no database.
