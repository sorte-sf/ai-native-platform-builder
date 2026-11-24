import fs from 'node:fs';
for (const [language, labels] of Object.entries({ en: { name: 'Page name', save: 'Save name', rename: 'Rename selected page', error: 'Page name could not be saved. Check your access and draft status.' }, tr: { name: 'Sayfa adı', save: 'Adı kaydet', rename: 'Seçili sayfayı yeniden adlandır', error: 'Sayfa adı kaydedilemedi. Erişim yetkinizi ve taslak durumunu kontrol edin.' } })) {
  const path = new URL(`../public/i18n/${language}.json`, import.meta.url);
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  catalog.pageRename = labels;
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
