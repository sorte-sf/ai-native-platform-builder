import fs from 'node:fs';
for (const [language, labels] of Object.entries({
 en: { title: 'Local AI designer', hint: 'Describe a change to this page. Uses local Ollama only. No changes are saved or published automatically.', command: 'Your instruction', thinking: 'Preparing proposal…', propose: 'Propose changes', review: 'Review the proposed page metadata before applying. Existing elements may be changed or removed.', apply: 'Apply to canvas', reject: 'Reject', undo: 'Undo last AI change', error: 'No valid proposal received. Check local Ollama, model readiness and your access, or try a smaller instruction.', stale: 'The page changed since this proposal. Generate a new proposal.' },
 tr: { title: 'Yerel AI tasarımcısı', hint: 'Bu sayfa için bir değişiklik açıklayın. Yalnızca yerel Ollama kullanılır. Otomatik kayıt veya yayın yapılmaz.', command: 'Talimatınız', thinking: 'Öneri hazırlanıyor…', propose: 'Değişiklik öner', review: 'Uygulamadan önce önerilen sayfa meta verilerini inceleyin. Mevcut öğeler değiştirilebilir veya kaldırılabilir.', apply: 'Tuvale uygula', reject: 'Reddet', undo: 'Son AI değişikliğini geri al', error: 'Geçerli öneri alınamadı. Yerel Ollama, model ve erişiminizi kontrol edin veya daha küçük bir talimat deneyin.', stale: 'Öneriden sonra sayfa değişti. Yeni bir öneri oluşturun.' }
})) {
 const path = new URL(`../public/i18n/${language}.json`, import.meta.url);
 const catalog = JSON.parse(fs.readFileSync(path, 'utf8')); catalog.aiDesigner = { ...labels, close: language === 'en' ? 'Close AI panel' : 'AI panelini kapat' };
 fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
}
