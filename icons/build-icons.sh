#!/bin/bash
# Rasterizes light.svg / dark.svg into PNG icons at 16/32/48/128 using headless
# Chrome (the same engine the Favicon Studio design rendered with). Transparent
# outside the rounded square; crisp at every size because each is rendered from
# the vector, not downscaled.
set -e
cd "$(dirname "$0")"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SIZES="16 32 48 128"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Regenerate the source SVGs.
node generate-icons.js

# Headless Chrome enforces a minimum window size, so tiny screenshots come out
# blank. Instead render one high-res master (512px) per variant, then downscale
# to each target with sips — clean anti-aliasing at every size.
MASTER=512

render_master() { # <svg> <outfile>
  local svg="$1" out="$2"
  cat > "$TMP/w.html" <<HTML
<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}
svg{display:block;width:${MASTER}px;height:${MASTER}px}</style></head>
<body>$(sed 's/width="128" height="128"/width="'"$MASTER"'" height="'"$MASTER"'"/' "$svg")</body></html>
HTML
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --default-background-color=00000000 \
    --window-size="${MASTER},${MASTER}" \
    --screenshot="$out" "file://$TMP/w.html" >/dev/null 2>&1
}

render_master light.svg "$TMP/master-light.png"
render_master dark.svg  "$TMP/master-dark.png"

for s in $SIZES; do
  cp "$TMP/master-light.png" "quill-${s}.png"
  cp "$TMP/master-dark.png"  "quill-${s}-dark.png"
  sips -z "$s" "$s" "quill-${s}.png"      >/dev/null 2>&1
  sips -z "$s" "$s" "quill-${s}-dark.png" >/dev/null 2>&1
  echo "built quill-${s}.png + quill-${s}-dark.png"
done
