import fs from 'node:fs';
for (const [language, labels] of Object.entries({
  en: { modules: 'Application studio modules', uiDesign: 'UI Design', dataSources: 'Data Sources', automation: 'Process Automation', email: 'Email Builder', reports: 'Report Designer', jobs: 'Scheduled Jobs', api: 'API Builder', configuration: 'Configuration Manager', helpDesk: 'Help Desk', unavailable: 'Not available yet' },
  tr: { modules: 'Uygulama stüdyosu modülleri', uiDesign: 'Arayüz Tasarımı', dataSources: 'Veri Kaynakları', automation: 'Süreç Otomasyonu', email: 'E-posta Tasarımcısı', reports: 'Rapor Tasarımcısı', jobs: 'Zamanlanmış Görevler', api: 'API Oluşturucu', configuration: 'Yapılandırma Yöneticisi', helpDesk: 'Yardım Masası', unavailable: 'Henüz kullanılamıyor' }
})) {
  const path = new URL(`../public/i18n/${language}.json`, import.meta.url);
  const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
  catalog.studioToolbar = { ...catalog.studioToolbar, ...labels };
  fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
