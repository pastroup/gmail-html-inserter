// Regenerates the extension icons from the "Favicon Studio" design (gold quill).
// Faithful to Favicon Studio.dc.html: quill occupies 90% of a rounded square,
// centered; the quill's viewBox (34 12 90 92) is mapped into that square (the
// same non-uniform fit the design's canvas drawImage produces).
//
// Usage: node generate-icons.js   (writes light.svg + dark.svg)
// Rasterizing to PNG is done by build-icons.sh via qlmanage.

const fs = require("fs");
const path = require("path");

const S = 128; // master viewBox; qlmanage rasterizes this to each target size
const GOLD = "#8F7328";
const LIGHT_BG = "#EDEDEB";
const DARK_BG = "#2B2B2E";

// Quill occupies 90% of the canvas, centered — matches download(): qw = size*0.9.
const qw = S * 0.9;
const q0 = (S - qw) / 2;
// Map the quill artwork's viewBox "34 12 90 92" into the qw x qw square.
const sx = qw / 90;
const sy = qw / 92;
const radius = S * 0.18; // rounded() corner radius

// The quill artwork, verbatim from quillSVG(ink, bg) in the design.
function quill(ink, bg) {
  return [
    `<path d="M100 20 C118 46 98 76 56 82 C80 60 86 40 100 20 Z" fill="${ink}"/>`,
    `<path d="M86 34 l11 -3 M78 46 l12 -2 M70 58 l11 -1" fill="none" stroke="${bg}" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/>`,
    `<path d="M96 26 C80 48 66 66 54 80" fill="none" stroke="${bg}" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>`,
    `<path d="M56 80 L42 94" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`,
    `<path d="M42 94 l-3.5 6 7.5 -2 Z" fill="${ink}"/>`,
  ].join("");
}

function svg(bg, ink) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <clipPath id="r"><rect x="0" y="0" width="${S}" height="${S}" rx="${radius}" ry="${radius}"/></clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect x="0" y="0" width="${S}" height="${S}" fill="${bg}"/>
    <g transform="translate(${q0} ${q0}) scale(${sx} ${sy}) translate(-34 -12)">
      ${quill(ink, bg)}
    </g>
  </g>
</svg>
`;
}

const dir = __dirname;
fs.writeFileSync(path.join(dir, "light.svg"), svg(LIGHT_BG, GOLD));
fs.writeFileSync(path.join(dir, "dark.svg"), svg(DARK_BG, GOLD));
console.log("wrote light.svg + dark.svg");
