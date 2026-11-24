import fs from 'node:fs';
const translations = {
  en: { bar: 'Bar chart', line: 'Line chart', area: 'Area chart', pie: 'Pie chart', doughnut: 'Doughnut chart', funnel: 'Funnel chart', kanban: 'Kanban board', chartType: 'Chart type', valueField: 'Value field (sum)', recordCount: 'Count records', titleField: 'Card title field', kanbanHelp: 'Read-only pipeline view. Stage changes are not enabled.' },
  tr: { bar: 'Sütun grafik', line: 'Çizgi grafik', area: 'Alan grafik', pie: 'Pasta grafik', doughnut: 'Halka grafik', funnel: 'Huni grafik', kanban: 'Kanban panosu', chartType: 'Grafik türü', valueField: 'Değer alanı (toplam)', recordCount: 'Kayıt sayısı', titleField: 'Kart başlığı alanı', kanbanHelp: 'Salt okunur satış süreci görünümü. Aşama değişiklikleri etkin değildir.' }
};
for (const [language, values] of Object.entries(translations)) {
  const path = new URL(`../public/i18n/${language}.json`, import.meta.url);
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  data.businessBlocks = { ...data.businessBlocks, ...values };
  data.businessBlocks.sampleScope = language === 'en' ? 'Based on the first 50 accessible records; not the complete dataset.' : 'Erişilebilir ilk 50 kayda dayanır; tüm veri kümesini kapsamaz.';
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
