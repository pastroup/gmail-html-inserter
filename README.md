# Insert HTML into Gmail

A small, **local-only** Chrome extension (Manifest V3) for composing an HTML
email — a newsletter, a styled announcement, a formatted table — and dropping it
straight into a Gmail message.

It reproduces the core of cloudHQ's "HTML Editor for Gmail" without the account
or sync baggage: a popup with a syntax-highlighted HTML editor, a live preview,
and an **Insert** button that places your HTML into the Gmail compose window at
the cursor.

## Why it exists

Gmail's own compose box has no way to paste in raw HTML and have it render — you
either fight the rich-text editor or send from a heavyweight email service. This
extension gives you a fast path: write (or upload) HTML, see it rendered, insert
it into a draft, send. Nothing leaves your machine.

## What it does

- **HTML editor with live preview** — CodeMirror on the left, a rendered preview
  on the right that updates as you type.
- **Upload an `.html` file** — click **Upload HTML file**, or **drag and drop** a
  file onto the editor.
- **Insert at the cursor** — click **Insert into Gmail** and the HTML lands in
  your open compose window where the caret last was.
- **Resets on restart** — your in-progress HTML is remembered while Chrome is
  running (close/reopen the popup freely), but a full Chrome restart returns the
  editor to the default starter content instead of remembering old drafts.

## Install

1. Build the editor bundle (CodeMirror is bundled locally — MV3 forbids CDN
   scripts):
   ```bash
   npm install
   npm run build      # writes vendor/editor.bundle.js
   ```
   Use `npm run watch` while iterating on `editor-entry.js`.
2. Go to `chrome://extensions`, enable **Developer mode** (top right).
3. **Load unpacked** → select this folder.
4. Pin the extension so the gold-quill icon shows in the toolbar.

## Use

1. Open Gmail and click **Compose**.
2. Click into the message body to place your cursor.
3. Click the extension icon. Type HTML, **upload** a file, or **drag-drop** one
   in; check the preview on the right.
4. Click **Insert into Gmail** — the HTML appears in your draft at the cursor.
5. Send as normal.

If insertion reports no compose window: make sure a Gmail **Compose** window is
open. (The extension auto-injects itself into Gmail tabs that were already open
before it was loaded, so you shouldn't need to refresh.)

## Important limitation (Gmail-side, unavoidable)

Gmail sanitizes HTML when the message is **sent**. Inline `style="..."`
attributes and standard tags survive; `<style>` blocks, `<script>`, external
stylesheets, `class`/`id`-based CSS (including `@media` queries and dark mode),
and forms are **stripped**.

Write **email-safe HTML**: inline styles only, tables for layout, and
fluid/`max-width` sizing instead of media queries. This is the same constraint
that applies to all HTML email — it is not specific to this extension.

## Privacy

Fully local. The only site permission is `https://mail.google.com/*`. No
analytics, no external servers, no account. `storage` is used only to remember
your draft for the current Chrome session; `scripting` is used only to inject
the Gmail insertion script on demand.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Project layout

| Path | Role |
| --- | --- |
| `manifest.json` | MV3 config; Gmail-only host permission, extension icons |
| `content.js` | Runs in Gmail; tracks the focused compose body + caret and inserts HTML |
| `popup.html` / `popup.css` / `popup.js` | Editor + live preview + upload/drag-drop UI |
| `editor-entry.js` | CodeMirror setup, bundled to `vendor/editor.bundle.js` |
| `icons/` | Gold-quill favicons (light default + dark variants) and the SVG source + build script |

The Gmail compose selector lives in one place (`COMPOSE_SELECTOR` in
`content.js`) — that's the main thing to update if Gmail ever changes its DOM.

### Regenerating the icons

The icons come from the "Favicon Studio" Claude Design mockup. To rebuild them:

```bash
cd icons
./build-icons.sh   # regenerates light.svg/dark.svg and rasterizes all PNG sizes
```
