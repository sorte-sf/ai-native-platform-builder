import fs from 'node:fs';
import path from 'node:path';
import { parseTemplate } from '@angular/compiler';
import ts from 'typescript';
const root = path.resolve('src/app');
const files = [];
function walk(dir) { for (const item of fs.readdirSync(dir, {withFileTypes:true})) { const p=path.join(dir,item.name); if(item.isDirectory())walk(p); else if(/\.(html|ts)$/.test(p))files.push(p); } }
walk(root);
const templates=[];
for(const file of files) {
 const source=fs.readFileSync(file,'utf8');
 if(file.endsWith('.html')) templates.push({file,source,offset:0});
 else { const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true); function visit(node) { if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='template'&&(ts.isStringLiteral(node.initializer)||ts.isNoSubstitutionTemplateLiteral(node.initializer))&&node.initializer.text.includes('<'))templates.push({file,source:node.initializer.text,offset:node.initializer.getStart(ast)+1}); ts.forEachChild(node,visit); } visit(ast); }
}
const found=[];
const human=s=>/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(s)&&!/^https?:|^[A-Z]{2}$|^\d|^@/.test(s);
for(const template of templates) {
 const ast=parseTemplate(template.source,template.file,{preserveWhitespaces:true});
 function add(start,end,value,kind) {const text=value.trim();if(human(text))found.push({file:template.file,start:template.offset+start,end:template.offset+end,text,kind,raw:value});}
 function visit(node) {
   if(node.constructor.name==='Text')add(node.sourceSpan.start.offset,node.sourceSpan.end.offset,node.value,'text');
   if(node.constructor.name==='BoundText') {
     const raw=template.source.slice(node.sourceSpan.start.offset,node.sourceSpan.end.offset); const re=/{{[\s\S]*?}}/g; let prev=0;
     for(const match of raw.matchAll(re)) { add(node.sourceSpan.start.offset+prev,node.sourceSpan.start.offset+match.index,raw.slice(prev,match.index),'text'); prev=match.index+match[0].length; }
     add(node.sourceSpan.start.offset+prev,node.sourceSpan.end.offset,raw.slice(prev),'text');
   }
   for(const attr of node.attributes??[])if(['placeholder','title','aria-label','alt'].includes(attr.name)&&attr.valueSpan)add(attr.sourceSpan.start.offset,attr.sourceSpan.end.offset,attr.value,`attr:${attr.name}`);
   for(const child of node.children??[])visit(child);
   for(const branch of node.branches??[])visit(branch);
   for(const branch of node.cases??[])visit(branch);
   if(node.empty)visit(node.empty); if(node.placeholder)visit(node.placeholder); if(node.loading)visit(node.loading); if(node.error)visit(node.error);
 }
 for(const node of ast.nodes)visit(node);
}
if(process.argv.includes('--locations'))console.log(JSON.stringify(found));
else console.log(JSON.stringify([...new Set(found.map(x=>x.text))].sort(),null,2));
