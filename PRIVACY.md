# Privacy Policy — Insert HTML into Gmail

**Effective date:** July 2, 2026

## Summary

**Insert HTML into Gmail** ("the extension") does **not** collect, store, transmit,
sell, or share any personal information or user data. Everything the extension
does happens locally in your browser. There are no servers, no analytics, no
trackers, and no third parties involved.

## What the extension accesses, and why

To do its job — letting you compose HTML and insert it into a Gmail message —
the extension works with the following, entirely on your device:

- **The HTML you type, upload, or drag into the editor.** This content stays in
  the extension popup and is only used to render a preview and to insert into
  your Gmail draft when you click "Insert into Gmail."
- **The content of the Gmail compose window** you insert into. The extension
  reads whether the draft already contains content (to ask whether to replace or
  append) and writes your HTML into it. It does **not** read, copy, or transmit
  your emails, contacts, or any other Gmail data, and it never sends this
  information anywhere.

None of this information leaves your computer. It is never sent to the
developer or to any external service.

## Local storage

The extension uses Chrome's **session storage** to temporarily remember the HTML
you are working on, so it is preserved if you close and reopen the popup during
the same browsing session. This data:

- is stored **only** in your browser, on your device;
- is **never** transmitted anywhere;
- is automatically **cleared when you restart Chrome**.

## Permissions

The extension requests the minimum permissions needed to function:

| Permission | Why it is used |
| --- | --- |
| Access to `mail.google.com` | To insert your HTML into the Gmail compose window and detect whether it already has content. |
| `storage` | To remember your in-progress HTML for the current browser session (local only). |
| `scripting` | To load the insertion script into an already-open Gmail tab when needed. |
| `tabs` | To identify the active Gmail tab to insert into. |

The extension does **not** request access to any website other than
`mail.google.com`.

## Data collection, sharing, and sale

- The extension does **not** collect or use any user data.
- The extension does **not** sell or transfer user data to any third party.
- The extension does **not** use or transfer user data for any purpose unrelated
  to its single purpose (inserting HTML into a Gmail message).
- The extension does **not** use or transfer user data to determine
  creditworthiness or for lending purposes.

## Children's privacy

The extension is a general-purpose productivity tool and is not directed to
children. It does not knowingly collect any information from anyone, including
children.

## Changes to this policy

If this policy changes, the updated version will be posted at this same location
with a revised effective date.

## Contact

Questions about this policy can be raised via the project's issue tracker:
<https://github.com/pastroup/gmail-html-inserter/issues>
