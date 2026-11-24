import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const occurrences=JSON.parse(execFileSync(process.execPath,['tools/collect-ui-translations.mjs','--locations'],{encoding:'utf8'}));
const turkish=JSON.parse(fs.readFileSync('tools/ui-turkish.json','utf8'));
const en=JSON.parse(fs.readFileSync('public/i18n/en.json','utf8'));
const tr=JSON.parse(fs.readFileSync('public/i18n/tr.json','utf8'));
en.ui??={};tr.ui??={};
const normalize=s=>s.trim().replace(/\s+/g,' ');
function key(text){text=normalize(text);const name=text.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,100)||'label';let id=name,n=2;while(en.ui[id]&&en.ui[id]!==text)id=name+'_'+n++;if(!turkish[text])return null;en.ui[id]=text;tr.ui[id]=turkish[text];return 'ui.'+id;}
const edits=new Map();
for(const item of occurrences){const id=key(item.text);if(!id)continue;const value=item.kind.startsWith('attr:')?`[${item.kind.slice(5)==='aria-label'?'attr.aria-label':item.kind.slice(5)}]="'${id}' | transloco"`:item.raw.replace(/\S[\s\S]*\S|\S/,`{{ '${id}' | transloco }}`);if(!edits.has(item.file))edits.set(item.file,[]);edits.get(item.file).push({...item,value});}
const changed=new Set();
for(const [file,items]of edits){let source=fs.readFileSync(file,'utf8');for(const e of items.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.value+source.slice(e.end);fs.writeFileSync(file,source);changed.add(file);}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);}
for(const file of walk('src/app').filter(x=>x.endsWith('.ts'))){let source=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let owner=false,imports;
 function visit(node){if(ts.isPropertyAssignment(node)){const name=node.name.getText(ast);if(name==='templateUrl'&&ts.isStringLiteral(node.initializer)&&changed.has(path.resolve(path.dirname(file),node.initializer.text)))owner=true;if(name==='template'&&ts.isStringLiteral(node.initializer)&&node.initializer.text.endsWith('.html')){owner=true;source=source.replace(node.getText(ast),`templateUrl: './${node.initializer.text}'`);}if(name==='imports'&&ts.isArrayLiteralExpression(node.initializer))imports=node.initializer;}ts.forEachChild(node,visit);}visit(ast);
 if(changed.has(path.resolve(file)))owner=true;
 if(!owner)continue;
 if(!imports){source=source.replace('@Component({','@Component({ imports: [TranslocoPipe],');source="import { TranslocoPipe } from '@jsverse/transloco';\n"+source;}
 if(imports&&!/Transloco(Pipe|Module)/.test(imports.getText(ast))){const original=imports.getText(ast);source=source.replace(original,original.replace('[','[TranslocoPipe, '));if(!/import\s*{[^}]*\bTranslocoPipe\b/s.test(source))source="import { TranslocoPipe } from '@jsverse/transloco';\n"+source;}
 fs.writeFileSync(file,source);
}
for(const [file,catalog]of [['public/i18n/en.json',en],['public/i18n/tr.json',tr]])fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
console.log(`Translated ${occurrences.length} occurrences in ${changed.size} templates.`);
