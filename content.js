// content.js — runs inside mail.google.com (and its compose iframes).
// Tracks the most recently focused Gmail compose body and its caret, then
// inserts HTML there when the popup asks.

(function () {
  "use strict";

  // Guard against running twice: the script is declared in the manifest AND may
  // be injected on demand by the popup (for tabs that predate the extension).
  if (window.__gmailHtmlInserterLoaded) return;
  window.__gmailHtmlInserterLoaded = true;

  // Gmail's compose body. aria-label is localized ("Message Body", "Corps du
  // message", ...) so we match the stable attributes and let focus tracking do
  // the rest. This selector is the main maintenance risk if Gmail changes.
  const COMPOSE_SELECTOR =
    'div[role="textbox"][contenteditable="true"][aria-label]';

  function isComposeBody(el) {
    return (
      el &&
      el.nodeType === 1 &&
      el.matches &&
      el.matches(COMPOSE_SELECTOR)
    );
  }

  // Last focused compose body + a cloned Range marking the caret at blur time.
  let lastComposeBody = null;
  let savedRange = null;

  function rememberSelection() {
    if (!lastComposeBody) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Only remember the caret if it actually lives inside the compose body.
    if (lastComposeBody.contains(range.commonAncestorContainer)) {
      savedRange = range.cloneRange();
    }
  }

  document.addEventListener(
    "focusin",
    (e) => {
      const body = e.target.closest && e.target.closest(COMPOSE_SELECTOR);
      if (body && isComposeBody(body)) {
        lastComposeBody = body;
        rememberSelection();
      }
    },
    true
  );

  // Keep the caret fresh while the user types/clicks in the compose body.
  // rememberSelection() itself checks the caret is inside lastComposeBody.
  document.addEventListener("selectionchange", rememberSelection);

  // Find a usable compose body: the remembered one, else the focused one,
  // else the first one on the page.
  function findComposeBody() {
    if (lastComposeBody && document.body.contains(lastComposeBody)) {
      return lastComposeBody;
    }
    const active = document.activeElement;
    if (isComposeBody(active)) return active;
    return document.querySelector(COMPOSE_SELECTOR);
  }

  function placeCaretInto(body) {
    // Restore the saved caret if it's still valid and inside this body.
    const sel = window.getSelection();
    if (
      savedRange &&
      body.contains(savedRange.commonAncestorContainer)
    ) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
      return;
    }
    // Otherwise drop the caret at the end of the body.
    const range = document.createRange();
    range.selectNodeContents(body);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Whether the compose body already holds something worth warning about. An
  // empty Gmail body is typically just a <br>, whose textContent is "".
  function bodyHasContent(body) {
    const text = (body.textContent || "").replace(/[\u200B\uFEFF]/g, "").trim();
    if (text.length > 0) return true;
    // Non-text content (images, tables, rules) still counts as "not empty".
    return !!body.querySelector("img, table, hr");
  }

  function insertHtml(html, body, mode) {
    // First attempt with no mode: if the draft already has content, don't
    // insert — ask the popup to have the user choose replace vs append.
    if (mode !== "replace" && mode !== "append" && bodyHasContent(body)) {
      return { ok: false, needsChoice: true };
    }

    body.focus();

    if (mode === "replace") {
      // Wipe the draft and drop the caret at the start of the now-empty body.
      body.innerHTML = "";
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(body);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRange = null;
    } else {
      // Empty body, or append: insert at the last known caret.
      placeCaretInto(body);
    }

    // Preferred path: execCommand handles caret placement inside contenteditable
    // and is the most battle-tested against Gmail's editor.
    let inserted = false;
    try {
      inserted = document.execCommand("insertHTML", false, html);
    } catch (e) {
      inserted = false;
    }

    // Fallback: manual Range insertion via a <template> fragment.
    if (!inserted) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        placeCaretInto(body);
      }
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const template = document.createElement("template");
      template.innerHTML = html;
      const fragment = template.content;
      const lastNode = fragment.lastChild;

      range.insertNode(fragment);

      // Collapse the caret to just after the inserted content.
      if (lastNode) {
        const after = document.createRange();
        after.setStartAfter(lastNode);
        after.collapse(true);
        sel.removeAllRanges();
        sel.addRange(after);
      }
    }

    // Refresh our saved caret so a follow-up insert lands after this one.
    rememberSelection();
    return { ok: true };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.type !== "INSERT_HTML") return;

    // With all_frames, this listener runs in every frame. Only the frame that
    // actually has a compose body should respond — otherwise a bare frame would
    // send a false "no-compose" that races the real inserter. Frames without a
    // compose body stay silent (return undefined) and don't hold the channel.
    const body = findComposeBody();
    if (!body) return;

    sendResponse(insertHtml(msg.html || "", body, msg.mode));
    return true;
  });
})();
