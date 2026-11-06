'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const pages=['index.html','offline/index.html'];
const forbidden=[
 ['HTML injection sink',/\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/],
 ['dynamic code execution',/\beval\s*\(|\bnew\s+Function\b/],
 ['document.write',/\bdocument\.write\s*\(/],
 ['javascript URL',/javascript\s*:/i]
];

function parseAttributes(tag){
 const attrs=Object.create(null);
 for(const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)){
  attrs[match[1].toLowerCase()]=match[2]??match[3]??match[4]??'';
 }
 return attrs;
}

function auditPage(relativePage){
 const absolutePage=path.join(root,relativePage);
 const html=fs.readFileSync(absolutePage,'utf8');
 const cspTag=html.match(/<meta\b[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/i);
 assert.ok(cspTag,relativePage+': a Content Security Policy meta tag is required.');
 const csp=parseAttributes(cspTag[0]).content||'';
 for(const required of [
  "default-src 'none'","script-src 'self'","connect-src 'self'",
  "object-src 'none'","base-uri 'none'","form-action 'none'"
 ]){
  assert.ok(csp.split(';').map(v=>v.trim()).includes(required),relativePage+': CSP is missing '+required+'.');
 }
 assert.ok(csp.split(';').map(v=>v.trim()).includes("style-src 'unsafe-inline'"),
  relativePage+': keep the current inline-style exception explicit.');

 const ids=new Set();
 for(const tag of html.matchAll(/<[a-z][^>]*>/gi)){
  const attrs=parseAttributes(tag[0]);
  if(attrs.id){
   assert.ok(!ids.has(attrs.id),relativePage+': duplicate element id "'+attrs.id+'".');
   ids.add(attrs.id);
  }
  for(const name of Object.keys(attrs)){
   assert.ok(!/^on[a-z]+$/i.test(name),relativePage+': inline event attribute '+name+' is not allowed.');
  }
 }

 const sources=[];
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  const attrs=parseAttributes('<script '+match[1]+'>');
  assert.ok(attrs.src,relativePage+': inline JavaScript is not allowed by the project CSP.');
  const source=attrs.src;
  assert.ok(!/^(?:[a-z]+:)?\/\//i.test(source)&&!/^data:/i.test(source)&&!/^javascript:/i.test(source),
   relativePage+': scripts must be same-origin relative paths.');
  const url=new URL(source,'https://diycraft.invalid/'+relativePage);
  assert.equal(url.origin,'https://diycraft.invalid',relativePage+': external script origin detected.');
  assert.equal(url.search,'',relativePage+': script URLs must not bypass canonical offline cache keys.');
  const resolved=path.resolve(root,decodeURIComponent(url.pathname).replace(/^\//,''));
  assert.ok(resolved===root||resolved.startsWith(root+path.sep),relativePage+': script path escapes the repository.');
  assert.ok(fs.existsSync(resolved),relativePage+': missing local script '+source+'.');
  sources.push(resolved);
 }
 assert.ok(sources.length>=20,relativePage+': expected the full local Three.js feature script set.');

 for(const scriptPath of sources){
  const code=fs.readFileSync(scriptPath,'utf8');
  for(const [label,pattern] of forbidden){
   assert.doesNotMatch(code,pattern,path.relative(root,scriptPath)+': '+label+' is prohibited.');
  }
 }
 const legacy=html.match(/<div\b[^>]*id=["']legacy-control-bindings["'][^>]*>/i);
 assert.ok(legacy,relativePage+': legacy programmatic controls container is missing.');
 const legacyAttrs=parseAttributes(legacy[0]);
 // `hidden` is a boolean HTML attribute, so it may appear without an equals sign.
 assert.ok(legacy[0].includes(' hidden '),relativePage+': compatibility controls must remain visually hidden.');
 assert.equal(legacyAttrs['aria-hidden'],'true',relativePage+': compatibility controls must remain hidden from assistive technology.');
 console.log('PASS '+relativePage+': CSP, unique IDs, local scripts, safe DOM and hidden compatibility controls ('+sources.length+' scripts).');
}

for(const page of pages)auditPage(page);
console.log('DIYCraft security audit complete.');
