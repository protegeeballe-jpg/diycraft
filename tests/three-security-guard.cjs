'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');

const runtimeFiles = [
  'js/three-world-adapter.js',
  'js/three-world-edit-sandbox.js',
  'js/three-world-protection.js',
  'js/three-world-raycast.js',
  'js/three-door-model.js',
  'js/three-door-motion.js',
  'js/three-performance-profile.js',
  'js/three-plant-geometry.js',
  'js/three-animal-geometry.js',
  'js/three-painterly-materials.js',
  'js/three-player-physics.js',
  'js/three-player-camera.js',
  'js/three-player-model.js',
  'js/three-neighbor-model.js',
  'js/three-neighbor-coloring.js',
  'js/three-world-time.js',
  'three-world-preview.js',
  'three-world-edit-preview.js'
];

const htmlFiles = [
  'index.html',
  'offline/index.html',
  'three-world-preview.html',
  'three-world-edit-preview.html'
];

function read(path) {
  assert.ok(fs.existsSync(path), 'Required security-reviewed file is missing: ' + path);
  return fs.readFileSync(path, 'utf8');
}

const forbiddenPatterns = [
  [/\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/, 'HTML string insertion sink'],
  [/\bdocument\s*\.\s*write\s*\(/, 'document.write'],
  [/\b(?:eval|execScript)\s*\(/, 'dynamic code execution'],
  [/\bnew\s+Function\s*\(/, 'Function constructor'],
  [/\bset(?:Timeout|Interval)\s*\(\s*['"]/, 'string-based timer execution'],
  [/\b(?:DOMParser|createContextualFragment)\b/, 'HTML string parser'],
  [/\bcreateElement\s*\(\s*['"]script['"]\s*\)/i, 'runtime script-element injection'],
  [/\b(?:WebSocket|EventSource|XMLHttpRequest)\b/, 'unreviewed network transport'],
  [/\bnavigator\s*\.\s*sendBeacon\b/, 'beacon data transmission'],
  [/\b(?:window|parent|top)\s*\.\s*postMessage\s*\(/, 'cross-context message transmission'],
  [/\bimport\s*\(/, 'dynamic module loading'],
  [/\b(?:https?:)?\/\/(?!www\.w3\.org\/2000\/svg\b)[^/\s"']+/i, 'remote URL literal']
];

for (const path of runtimeFiles) {
  const source = read(path);
  for (const [pattern, label] of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern, path + ' contains a prohibited or manually reviewed construct: ' + label);
  }
  assert.doesNotMatch(
    source,
    /\b(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|removeItem|clear)\s*\(/,
    path + ' must not write browser storage from the isolated migration renderer.'
  );
}

const fetchAllowlist = new Map([
  ['three-world-preview.js', 1],
  ['three-world-edit-preview.js', 1]
]);

for (const path of runtimeFiles) {
  const source = read(path);
  const matches = [...source.matchAll(/\bfetch\s*\(/g)];
  const expectedCount = fetchAllowlist.get(path) || 0;
  assert.equal(
    matches.length,
    expectedCount,
    path + ' has an unexpected network-read count; review every new request explicitly.'
  );

  for (const match of matches) {
    const lineStart = source.lastIndexOf('\n', match.index) + 1;
    const lineEnd = source.indexOf('\n', match.index);
    const line = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd);
    assert.match(
      line,
      /fetch\s*\(\s*'\.\/preview-three\/starter-world\.json'\s*,\s*\{\s*cache\s*:\s*'no-store'\s*\}\s*\)/,
      path + ' may only read the same-origin, CI-generated starter-world fixture.'
    );
  }
}

function contentSecurityPolicy(path) {
  const html = read(path);
  const match = html.match(/http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*content\s*=\s*"([^"]+)"/i);
  assert.ok(match, path + ' must declare an explicit Content-Security-Policy.');
  const directives = match[1].split(';').map(value => value.trim()).filter(Boolean);
  for (const required of [
    "default-src 'none'",
    "script-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ]) {
    assert.ok(directives.includes(required), path + ' is missing CSP directive: ' + required);
  }
  assert.ok(
    !/\bunsafe-(?:inline|eval)\b/i.test(directives.filter(value => value.startsWith('script-src')).join(';')),
    path + ' must not enable inline scripts or eval.'
  );

  const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)];
  assert.ok(scriptTags.length > 0, path + ' must load its JavaScript entry points.');
  for (const tag of scriptTags) {
    const src = tag[1].match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    assert.ok(src, path + ' must not contain inline executable script.');
    assert.ok(
      !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src[1]) && !/^(?:javascript|data):/i.test(src[1]),
      path + ' must load scripts only from relative same-origin paths.'
    );
  }
}

for (const path of htmlFiles) contentSecurityPolicy(path);

// Pin the vendored Three.js build to the reviewed upstream artifact.
// Changing Three.js requires an intentional version/license/security review.
const vendorPath = 'js/three.js';
const vendor = fs.readFileSync(vendorPath);
const gitBlobHeader = Buffer.from('blob ' + vendor.length + '\0', 'utf8');
const vendorBlobSha = crypto.createHash('sha1')
  .update(gitBlobHeader)
  .update(vendor)
  .digest('hex');

assert.equal(
  vendorBlobSha,
  'b14f47c0908bab15e890b468d53bb07db0be3a18',
  'The vendored Three.js file changed. Review its provenance, release, license and security notes before updating this pin.'
);
assert.match(vendor.toString('utf8', 0, 256), /SPDX-License-Identifier:\s*MIT/);

console.log(
  'Three.js security guard passed: no dynamic HTML/code sinks, no unreviewed network or storage writes, strict same-origin CSP, and pinned Three.js r128 vendor.'
);
