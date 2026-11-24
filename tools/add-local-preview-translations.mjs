import fs from 'node:fs';
for (const [language, values] of Object.entries({
  en: { close: 'Close preview', localHelp: 'Local preview of your unsaved design. Nothing is saved or published. Charts show sample data; live data and API dropdowns are disabled. Form records are temporary.' },
  tr: { close: 'Önizlemeyi kapat', localHelp: 'Kaydedilmemiş tasarımın yerel önizlemesi. Hiçbir şey kaydedilmez veya yayımlanmaz. Grafikler örnek veri gösterir; canlı veri ve API seçenekleri devre dışıdır. Form kayıtları geçicidir.' }
})) {
  const path = new URL(`../public/i18n/${language}.json`, import.meta.url);
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  data.preview = { ...data.preview, ...values };
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
