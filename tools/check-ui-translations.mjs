import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const en=JSON.parse(fs.readFileSync('public/i18n/en.json','utf8'));
const tr=JSON.parse(fs.readFileSync('public/i18n/tr.json','utf8'));
function flatten(value,prefix=''){return Object.entries(value).flatMap(([key,item])=>typeof item==='string'?[[prefix+key,item]]:flatten(item,prefix+key+'.'));}
const english=new Map(flatten(en)),turkish=new Map(flatten(tr));
assert.deepEqual([...english.keys()].sort(),[...turkish.keys()].sort(),'English and Turkish catalog keys must match');
for(const [key,value]of turkish)if(english.get(key)?.trim())assert.ok(value.trim(),`Empty Turkish translation: ${key}`);
let bindings=0;
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){walk(file);continue;}if(!/\.(html|ts)$/.test(file))continue;const source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/'(ui\.[^']+)'\s*\|\s*transloco/g)){assert.ok(english.has(match[1]),`Missing translation ${match[1]} in ${file}`);bindings++;}}}
walk('src/app');
const remaining=JSON.parse(execFileSync(process.execPath,['tools/collect-ui-translations.mjs','--locations'],{encoding:'utf8'})).filter(item=>item.text!=='/builder/…');
assert.equal(remaining.length,0,`Untranslated static template text: ${JSON.stringify(remaining)}`);
console.log(`Passed: ${english.size} matching catalog keys, ${bindings} UI bindings, no untranslated static template text.`);
