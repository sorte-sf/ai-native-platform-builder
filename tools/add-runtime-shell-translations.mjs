import fs from 'node:fs';
for (const [language, runtimeShell] of Object.entries({
  en: { navigation: 'Application navigation', expand: 'Expand menu', collapse: 'Collapse menu', returnDesigner: 'Return to designer' },
  tr: { navigation: 'Uygulama menüsü', expand: 'Menüyü genişlet', collapse: 'Menüyü daralt', returnDesigner: 'Tasarımcıya dön' }
})) {
  const path = new URL(`../public/i18n/${language}.json`, import.meta.url);
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  data.runtimeShell = { ...data.runtimeShell, ...runtimeShell };
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
