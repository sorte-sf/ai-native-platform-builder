import fs from 'node:fs';
for (const [language, preview] of Object.entries({
  en: { open: 'Preview draft', banner: 'Draft preview — saved design. Form and CRUD changes are temporary and disappear when you leave this page. Tables and widgets may read authorized live data. Nothing is published.', loadError: 'Draft preview could not be loaded. Check your application access.' },
  tr: { open: 'Taslağı önizle', banner: 'Taslak önizlemesi — kaydedilmiş tasarım. Form ve CRUD değişiklikleri geçicidir; sayfadan ayrıldığınızda silinir. Tablolar ve göstergeler yetkili canlı verileri okuyabilir. Yayınlama yapılmaz.', loadError: 'Taslak önizlemesi yüklenemedi. Uygulama erişiminizi kontrol edin.' }
})) {
  const path = new URL(`../public/i18n/${language}.json`, import.meta.url);
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  catalog.preview = { ...catalog.preview, ...preview };
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
