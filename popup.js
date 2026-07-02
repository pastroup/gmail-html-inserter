// popup.js — wires the CodeMirror editor to the live preview and the Insert
// button to the Gmail content script.

const STORAGE_KEY = "gmail_html_editor_content";

// Session storage keeps your edits while the popup is closed/reopened within a
// Chrome session, but is cleared when Chrome restarts — so each restart starts
// fresh from DEFAULT_HTML rather than remembering old HTML forever.
const STORE = chrome.storage.session;

// Default starter content: a titled intro that explains the tool. Shown on
// first run and whenever "Reset to default" is clicked.
const DEFAULT_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif;">
  <tr>
    <td style="padding: 24px; background: #f6f8fc; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h1 style="margin: 0 0 10px; font-size: 20px; color: #1a73e8;">Insert HTML into Gmail</h1>
      <p style="margin: 0 0 12px; font-size: 14px; line-height: 21px; color: #202124;">
        Write or paste HTML in the editor on the left and watch it render here. When
        it looks right, place your cursor in a Gmail compose window and click
        <strong>Insert into Gmail</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 20px; color: #5f6368;">
        Tip: Gmail keeps inline <code>style="..."</code> but strips
        &lt;style&gt; blocks and CSS classes &mdash; use inline styles and tables for
        layout. Use the <strong>Load example newsletter</strong> link above to see a
        full layout, and <strong>Reset to default</strong> to come back here.
      </p>
    </td>
  </tr>
</table>`;

// A fuller, email-safe newsletter the user can load via the header link. Fluid
// (max-width) + inline styles only, so it survives Gmail's sanitizer.
const EXAMPLE_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e7ecf0;">
  <tr>
    <td align="center" style="padding:16px 10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff;">
        <tr><td style="height:6px; background:#8F7328; font-size:0; line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:28px 28px 0 28px;">
            <p style="margin:0 0 6px 0; font-family:Georgia,'Times New Roman',serif; font-size:12px; letter-spacing:2px; text-transform:uppercase; font-weight:bold; color:#8F7328;">Newsletter</p>
            <h1 style="margin:0 0 12px 0; font-family:Georgia,'Times New Roman',serif; font-size:24px; line-height:30px; color:#111111;">Your headline goes here</h1>
            <p style="margin:0 0 16px 0; font-family:Arial,sans-serif; font-size:16px; line-height:25px; color:#000000;">This is an example newsletter layout. Everything uses inline styles and a fluid <strong>max-width:600px</strong> container, so it holds up in Gmail on both desktop and mobile. Replace this text with your own.</p>
            <a href="https://example.com" style="display:inline-block; padding:11px 20px; background:#8F7328; color:#ffffff; text-decoration:none; border-radius:6px; font-family:Arial,sans-serif; font-size:14px; font-weight:bold;">Read more</a>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px 28px 28px;">
            <p style="margin:0; padding-top:16px; border-top:1px solid #eeeeee; font-family:Arial,sans-serif; font-size:12px; line-height:18px; color:#9aa0a6; text-align:center;">You&rsquo;re receiving this because you subscribed. &nbsp;|&nbsp; Unsubscribe</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

const previewEl = document.getElementById("preview");
const statusEl = document.getElementById("status");
const insertBtn = document.getElementById("insert");
const clearBtn = document.getElementById("clear");
const loadBtn = document.getElementById("load");
const fileInput = document.getElementById("file");
const resetBtn = document.getElementById("reset");
const loadExampleLink = document.getElementById("load-example");
const modalEl = document.getElementById("confirm");
const modalMsgEl = document.getElementById("confirm-msg");
const modalActionsEl = document.getElementById("confirm-actions");

let editor;
let previewTimer;

function setStatus(text, kind) {
  statusEl.textContent = text || "";
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function renderPreview(html) {
  // sandbox="" fully isolates the iframe — scripts don't run, nothing can reach
  // the popup. srcdoc renders the raw markup so you see what you'll insert.
  previewEl.srcdoc = html;
}

function schedulePreview(html) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => renderPreview(html), 150);
}

function persist(html) {
  STORE.set({ [STORAGE_KEY]: html });
}

function onEditorChange(html) {
  schedulePreview(html);
  persist(html);
  setStatus("");
}

// Send the insert message; resolves { noReceiver: true } when no content-script
// frame answers (either the script isn't there, or no compose frame responded).
function sendInsert(tabId, html, mode) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "INSERT_HTML", html, mode },
      (response) => {
        if (chrome.runtime.lastError || !response) {
          resolve({ noReceiver: true });
        } else {
          resolve(response);
        }
      }
    );
  });
}

// Sends the insert, injecting the content script and retrying once if the tab
// predates the extension being loaded. Returns null (after setting an error
// status) only when injection fails.
async function attemptInsert(tabId, html, mode) {
  let result = await sendInsert(tabId, html, mode);
  if (result.noReceiver) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ["content.js"],
      });
      result = await sendInsert(tabId, html, mode);
    } catch (e) {
      setStatus("Couldn't access this Gmail tab — try reloading it.", "err");
      return null;
    }
  }
  return result;
}

async function insertIntoGmail() {
  const html = editor.getValue();
  if (!html.trim()) {
    setStatus("Nothing to insert.", "err");
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/mail\.google\.com\//.test(tab.url || "")) {
    setStatus("Open a Gmail tab first.", "err");
    return;
  }

  let result = await attemptInsert(tab.id, html, undefined);
  if (!result) return;

  // The draft already has content — let the user replace it or append to it.
  if (result.needsChoice) {
    const choice = await askAction(
      "This message already has content. Replace it, or append your HTML to the end?",
      [
        { label: "Cancel", value: "cancel", kind: "secondary" },
        { label: "Append", value: "append", kind: "secondary" },
        { label: "Replace", value: "replace", kind: "primary" },
      ],
      "cancel"
    );
    if (choice !== "append" && choice !== "replace") {
      setStatus("");
      return;
    }
    result = await attemptInsert(tab.id, html, choice);
    if (!result) return;

    if (result.ok) {
      setStatus(
        choice === "replace" ? "Replaced your draft." : "Appended to your draft.",
        "ok"
      );
      return;
    }
  }

  if (result.noReceiver) {
    setStatus("Open a Gmail compose window, then try again.", "err");
  } else if (result.ok) {
    setStatus("Inserted into your draft.", "ok");
  } else {
    setStatus("Could not insert. Is a compose window open?", "err");
  }
}

// Set the editor content, refresh the preview, and persist — used by every
// action that swaps content (clear, reset, load example, upload).
function applyContent(html) {
  editor.setValue(html);
  renderPreview(html);
  persist(html);
}

// Shows the in-popup dialog with a dynamic set of buttons. Resolves to the
// chosen button's `value`, or `cancelValue` on Esc / backdrop click.
// buttons: [{ label, value, kind: "primary" | "secondary" }]
function askAction(message, buttons, cancelValue) {
  return new Promise((resolve) => {
    modalMsgEl.textContent = message;
    modalActionsEl.innerHTML = "";

    const cleanup = (result) => {
      modalEl.hidden = true;
      modalEl.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    const onBackdrop = (e) => {
      if (e.target === modalEl) cleanup(cancelValue);
    };
    const onKey = (e) => {
      if (e.key === "Escape") cleanup(cancelValue);
    };

    let primaryBtn = null;
    buttons.forEach((b) => {
      const el = document.createElement("button");
      el.className = "btn " + (b.kind === "primary" ? "btn-primary" : "btn-secondary");
      el.textContent = b.label;
      el.addEventListener("click", () => cleanup(b.value));
      modalActionsEl.appendChild(el);
      if (b.kind === "primary") primaryBtn = el;
    });

    modalEl.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    modalEl.hidden = false;
    (primaryBtn || modalActionsEl.lastElementChild).focus();
  });
}

// Two-button confirm (Cancel + one action). Enter/primary confirms.
async function confirmAction(message, okLabel) {
  const result = await askAction(
    message,
    [
      { label: "Cancel", value: false, kind: "secondary" },
      { label: okLabel || "Confirm", value: true, kind: "primary" },
    ],
    false
  );
  return result === true;
}

async function clearEditor() {
  const ok = await confirmAction(
    "Clear the editor? This removes all current HTML.",
    "Clear"
  );
  if (!ok) return;
  applyContent("");
  setStatus("Cleared.", "ok");
}

async function resetToDefault() {
  const ok = await confirmAction(
    "Reset to the default view? Your current HTML will be replaced.",
    "Reset"
  );
  if (!ok) return;
  applyContent(DEFAULT_HTML);
  setStatus("Reset to default.", "ok");
}

function loadExample() {
  applyContent(EXAMPLE_HTML);
  setStatus("Loaded example newsletter.", "ok");
}

function loadFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const html = typeof reader.result === "string" ? reader.result : "";
    applyContent(html);
    setStatus(`Loaded ${file.name}`, "ok");
  };
  reader.onerror = () => setStatus("Could not read that file.", "err");
  reader.readAsText(file);
}

async function init() {
  const stored = await STORE.get(STORAGE_KEY);
  const initial =
    typeof stored[STORAGE_KEY] === "string" ? stored[STORAGE_KEY] : DEFAULT_HTML;

  editor = window.GmailHtmlEditor.create({
    parent: document.getElementById("editor"),
    doc: initial,
    onChange: onEditorChange,
  });

  renderPreview(initial);

  insertBtn.addEventListener("click", insertIntoGmail);
  clearBtn.addEventListener("click", clearEditor);
  resetBtn.addEventListener("click", resetToDefault);
  loadExampleLink.addEventListener("click", (e) => {
    e.preventDefault();
    loadExample();
  });
  loadBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    loadFromFile(fileInput.files[0]);
    // Reset so selecting the same file again still fires "change".
    fileInput.value = "";
  });

  setupDragAndDrop();
}

function setupDragAndDrop() {
  const zone = document.getElementById("editor");

  // Prevent the whole window from navigating away when a file is dropped
  // anywhere outside the drop zone.
  ["dragover", "drop"].forEach((evt) =>
    window.addEventListener(evt, (e) => e.preventDefault())
  );

  const hasFile = (e) =>
    e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");

  zone.addEventListener("dragenter", (e) => {
    if (hasFile(e)) zone.classList.add("drop-hover");
  });
  zone.addEventListener("dragover", (e) => {
    if (hasFile(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      zone.classList.add("drop-hover");
    }
  });
  zone.addEventListener("dragleave", (e) => {
    // Only clear when the pointer actually leaves the zone, not its children.
    if (e.target === zone || !zone.contains(e.relatedTarget)) {
      zone.classList.remove("drop-hover");
    }
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drop-hover");
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFromFile(file);
  });
}

init();
