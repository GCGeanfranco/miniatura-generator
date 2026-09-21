# AGENTS.md

Chrome MV3 extension "Flow Prompt Sender": a React 19 popup that sends prompts into the Google Flow editor (`flow.google.com`). Built with WXT 0.21 (Vite-based) + TypeScript.

## Commands

- `npm run dev` — watch mode; loads unpacked from `.output/chrome-mv3-dev`
- `npm run build` — prod build to `.output/chrome-mv3`
- `npm run compile` — `tsc --noEmit` typecheck (the only automated verification; there is no test suite, linter, or CI)
- `npm run zip` / `zip:firefox`, `dev:firefox` / `build:firefox` — Firefox flavors (Chromium is the primary target)

`.wxt/` (generated types) and `.output/` (build output) are gitignored. The project `tsconfig.json` extends `./.wxt/tsconfig.json`, which `postinstall` (i.e. `wxt prepare`) generates — after a fresh clone, run `npm install` before `npm run compile`.

## Layout

- `entrypoints/content.ts` — the whole product. Matches `*://flow.google.com/*` (`allFrames: true`), locates the ProseMirror editor and submit button via DOM selectors, listens on `browser.runtime.onMessage` for `{ type: 'FLOW_SEND_PROMPT', prompt }`, and answers asynchronously via `sendResponse`.
- `entrypoints/popup/` — React popup. Sends the message above via `browser.tabs.sendMessage`; if that throws (tab open before extension reload), it injects `/content-scripts/content.js` via `browser.scripting.executeScript` and retries. `/content-scripts/content.js` is the stable WXT output path for `content.ts` (see generated `.wxt/types/paths.d.ts`).
- `entrypoints/background.ts` — placeholder, no logic.
- `wxt.config.ts` — manifest source: name "Flow Prompt Sender", permissions `activeTab` + `scripting`, host permission `*://flow.google.com/*`.
- `public/icon/` — extension icons.

## Gotchas

- Don't "modernize" the flow.google.com interaction logic: `document.execCommand('insertText')` is deprecated but is the only way to make ProseMirror/Angular fire the `beforeinput`/`input` events it reacts to, and `btn.click()` produces a trusted click. Both are deliberate (see comments in `content.ts`).
- The submit button starts `disabled` and is enabled by Angular only after the editor has content; `content.ts` waits for that via a `MutationObserver` instead of a fixed delay. Preserve that pattern.
- UI copy and code comments are in Spanish — keep new user-facing strings in Spanish.
- This repo is a renamed WXT starter: `package.json` still says `wxt-react-starter` and the folder is `miniatura-generator`, but the actual product is Flow Prompt Sender. Don't write code or copy based on the stale names.