import fs from 'node:fs';
for (const [language, values] of Object.entries({
  en: { gallery: 'Image gallery', 'data-grid': 'Data grid', pagination: 'Pagination', pageSize: 'Items per page', galleryColumns: 'Gallery columns (1–6)', imageField: 'Image URL field', image: 'Image', paginationTarget: 'Target gallery', paginationHelp: 'Select a gallery to control its pages.' },
  tr: { gallery: 'Resim galerisi', 'data-grid': 'Veri ızgarası', pagination: 'Sayfalama', pageSize: 'Sayfa başına öğe', galleryColumns: 'Galeri sütunları (1–6)', imageField: 'Resim URL alanı', image: 'Resim', paginationTarget: 'Hedef galeri', paginationHelp: 'Sayfalarını kontrol etmek için bir galeri seçin.' }
})) {
  const path = new URL(`../public/i18n/${language}.json`, import.meta.url);
  const data = JSON.parse(fs.readFileSync(path, 'utf8')); data.businessBlocks = { ...data.businessBlocks, ...values };
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
