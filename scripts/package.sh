#!/bin/bash
# Builds a clean, minimal extension bundle in dist/ containing ONLY the files
# Chrome actually loads — no node_modules, build scripts, or design handoff.
# Run via: npm run package  (which builds the minified bundle first).
set -e
cd "$(dirname "$0")/.."

DIST="dist"
rm -rf "$DIST"
mkdir -p "$DIST/vendor" "$DIST/icons"

# Runtime files referenced by the manifest / popup, plus the README for docs.
cp manifest.json content.js popup.html popup.css popup.js README.md "$DIST/"
cp vendor/editor.bundle.js "$DIST/vendor/"

# Only the icon sizes the manifest references (light set). Dark variants, SVGs,
# and the icon build scripts stay out of the shipped bundle.
cp icons/quill-16.png icons/quill-32.png icons/quill-48.png icons/quill-128.png "$DIST/icons/"

# Zip it for upload / sharing.
( cd "$DIST" && zip -qr -X ../gmail-html-inserter.zip . )

echo "dist/ contents:"
find "$DIST" -type f | sort
echo
echo "dist size:  $(du -sh "$DIST" | cut -f1)"
echo "zip:        gmail-html-inserter.zip ($(du -h gmail-html-inserter.zip | cut -f1))"
