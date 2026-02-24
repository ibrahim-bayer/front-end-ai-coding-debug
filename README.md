# Chrome2Code

**Capture browser errors. Generate fix prompts. Let AI fix your code.**

Chrome2Code is a developer tool that captures console errors, failed network requests, and user actions from your browser during development, then generates structured prompt files you feed to [Claude Code](https://claude.ai) to fix the issues automatically.

Built by [IBGroup](https://ibgroup.dev)

---

## How It Works

```
1. You test your app in Chrome
2. Chrome2Code extension records everything — errors, network failures, clicks, navigation
3. You export the incident as a JSON file
4. You drop it into your project and run `chrome2code generate`
5. A structured prompt file is created
6. You run the prompt with Claude Code — it reads your project and fixes the code
```

## Quick Start

### Prerequisites

- Node.js 20+
- Google Chrome
- [Claude Code CLI](https://claude.ai) installed

### Install

```bash
git clone https://github.com/ibrahim-bayer/front-end-ai-coding-debug.git
cd front-end-ai-coding-debug
npm install
```

### Build the Chrome Extension

```bash
npm run build:extension
```

Then load it in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `packages/extension/dist/chrome-mv3/` folder

### Build the CLI

```bash
npm run build:cli
```

To use it globally:

```bash
cd packages/cli
npm link
```

Now `chrome2code` is available as a command anywhere on your system.

## Usage

### Step 1 — Initialize your project

In your project root (where `CLAUDE.md` lives):

```bash
chrome2code init
```

This creates:
```
your-project/
├── .chrome2code/
│   └── incidents/    ← drop incident JSON files here
└── prompts/          ← generated prompt files appear here
```

### Step 2 — Capture errors in the browser

1. Open your app in Chrome with the extension installed
2. The extension automatically records:
   - Button clicks, form inputs, navigation
   - Console errors and unhandled promise rejections
   - Failed network requests (4xx, 5xx, timeouts)
   - Console.log output
3. When something breaks, click the Chrome2Code extension icon
4. Click **Create Incident** and add optional notes
5. Click **Export JSON** to download the incident file

### Step 3 — Generate fix prompts

Drop the exported JSON file into `.chrome2code/incidents/` in your project, then:

```bash
chrome2code generate
```

This creates a structured prompt file in `prompts/`:

```markdown
# Fix: login-crash

## Route
http://localhost:3000/dashboard/orders

## Errors
**TypeError**: Cannot read property 'map' of undefined
    at OrderList.render (src/components/OrderList.jsx:24:18)

## User Actions Leading to Error
1. **Click** `a.nav-link` — "Orders"
2. **Navigate** /dashboard → /dashboard/orders
3. **Click** `button#load-orders` — "Load Orders"

## Failed Network Requests
- **GET** `/api/orders` → **500** Internal Server Error (245ms)

## Task
Investigate the error starting at OrderList.render...
```

### Step 4 — Fix with Claude Code

```bash
claude "$(cat prompts/login-crash.prompt.md)"
```

Claude Code reads your `CLAUDE.md`, understands your project, and applies the fix.

### Step 5 — Mark as resolved

```bash
chrome2code resolve login-crash
```

## CLI Commands

| Command | Description |
|---|---|
| `chrome2code init` | Create `.chrome2code/incidents/` and `prompts/` directories |
| `chrome2code generate` | Generate prompts for all new incidents |
| `chrome2code generate <name>` | Generate prompt for a specific incident |
| `chrome2code generate --force` | Overwrite existing prompt files |
| `chrome2code list` | List all incidents with status |
| `chrome2code resolve <name>` | Mark an incident as resolved |

## What Gets Captured

| Data | Source | Why It Matters |
|---|---|---|
| Console errors | `window.onerror`, `unhandledrejection` | The actual error and stack trace |
| Network failures | `chrome.webRequest` API | API errors that cause frontend crashes |
| User clicks | DOM click event listener | What the user did before the error |
| Form inputs | DOM change event listener | Field names (not values) for context |
| Navigation | `pushState`/`popState` interception | Which route the error happened on |
| Console logs | Console API override | Developer debug output at time of error |

## DevTools Panel

Chrome2Code also adds a **DevTools panel** (open DevTools → Chrome2Code tab) with a live view of:

- Captured errors
- Failed network requests
- User action timeline
- Console log output
- Saved incidents

---

## FAQ

### What problem does Chrome2Code solve?

When debugging frontend issues, developers waste time copy-pasting error messages, describing what they clicked, and manually gathering context. Chrome2Code captures all of this automatically — the error, the stack trace, the failed API calls, and the exact sequence of user actions — then packages it into a structured prompt that AI can act on.

### How does Chrome2Code fill the gap in developer troubleshooting?

Chrome2Code is not an alternative to AI coding assistants — it is **complementary**. The gap in developer troubleshooting today is not the AI's ability to fix code. It is the time and energy developers spend **gathering context** before they can even ask for help.

Think about what happens when something breaks:
- You see an error in the console. You copy it.
- You check the Network tab. You screenshot the failed request.
- You try to remember what you clicked before it broke.
- You open the source file and try to describe the flow.
- You type all of this into an AI chat, hoping you included enough detail.

This process takes 5–15 minutes per issue. Multiply that by every bug in a sprint.

Chrome2Code eliminates that manual gathering. It automatically captures:
- The **error and stack trace** at the moment it happens
- The **failed API calls** with request/response details
- The **exact sequence of user actions** leading to the crash
- The **console output** and developer logs
- The **route/URL** for immediate code location

All of this is packaged into a structured prompt that an AI assistant can act on immediately. You save time. You save energy. The AI gets better context and produces better fixes.

### Does Chrome2Code fix the code automatically?

No. Chrome2Code generates a **prompt file** — a structured description of the problem. You decide when to run it through Claude Code. Claude Code reads your project files (via `CLAUDE.md`) and applies the fix. You stay in control.

### What frameworks and languages does it work with?

Chrome2Code is **code-agnostic**. It captures browser-level data (errors, network, DOM events), not framework-specific data. It works with React, Vue, Angular, Svelte, vanilla JavaScript, or any web application that runs in Chrome.

### Does it work with production apps?

Chrome2Code is designed as a **development tool**. It captures errors while you test locally or on staging environments. For production error monitoring, use dedicated tools like Sentry or LogRocket.

### Does the extension slow down my browser?

The content script adds lightweight event listeners (click, change, submit, popstate). The rolling buffer keeps only the last 30 actions in memory. Network monitoring uses Chrome's native `webRequest` API. Impact is negligible.

### Is my code sent to any server?

No. In the current version, everything stays local. The extension stores incidents in Chrome's local storage. JSON files live in your project folder. The CLI reads and writes local files only. No data leaves your machine (except when you run Claude Code, which uses the Anthropic API).

### Can I capture what buttons the user clicked?

Yes. The content script records every click with the CSS selector and text content of the clicked element. For example: `Click button#submit — "Place Order"`. It also captures form submissions and input field changes (field names only, not values).

### Can I capture failed API requests?

Yes. Chrome2Code monitors all network requests via `chrome.webRequest` and records any that return 4xx or 5xx status codes, along with CORS errors and timeouts. Response bodies are captured and truncated to 1KB.

### How do I add more context to an incident?

When creating an incident from the popup or DevTools panel, you can add **developer notes** — a free text field where you describe what you were testing, what you expected to happen, or any other context that helps.

You can also add `console.log` statements in your code. Chrome2Code captures all console output, so your debug logs become part of the incident automatically.

### Can I use this with a team?

The current MVP is local-only. A future version will include a server API with token-based authentication and a web portal for team incident management. See the [roadmap](./roadmap.md) for planned features.

### What Chrome version do I need?

Chrome2Code uses Manifest V3, which requires Chrome 88 or later. Any modern version of Chrome, Edge, or Brave will work.

---

## Project Structure

```
chrome2code/
├── packages/
│   ├── extension/          # Chrome extension (WXT framework)
│   │   ├── entrypoints/    # Background, content, popup, devtools
│   │   ├── lib/            # Shared types, buffer, messages
│   │   └── wxt.config.ts
│   └── cli/                # CLI tool
│       └── src/
│           ├── commands/    # init, generate, list, resolve
│           └── generator/   # Prompt template engine
├── CLAUDE.md               # Project conventions for Claude Code
└── roadmap.md              # Development roadmap and phases
```

## Tech Stack

- **Extension**: TypeScript, [WXT Framework](https://wxt.dev) (v0.20+), Manifest V3
- **CLI**: TypeScript, Node.js 20+, [Commander.js](https://github.com/tj/commander.js), [tsup](https://github.com/egoist/tsup)
- **Monorepo**: npm workspaces

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the conventions in [CLAUDE.md](./CLAUDE.md)
4. Submit a pull request

## License

MIT

---

Built with care by [IBGroup](https://ibgroup.dev)
