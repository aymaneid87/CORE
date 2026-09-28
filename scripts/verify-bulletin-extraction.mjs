// ==========================================================
// اختبار دقة قراءة النشرة بالذكاء الاصطناعي على ملف حقيقي
// بيقرا الصفحات بنفس كود السيرفر (قراءتين لكل صفحة) ويقارن بالبنود المنقولة يدوياً من نشرة يونيو 2026.
//
// التشغيل:
//   ANTHROPIC_API_KEY=... node scripts/verify-bulletin-extraction.mjs <ملف.pdf> [--pages 3,5,9]
// بيطبع تقرير ويحفظ كل السطور المستخرجة في bulletin-extraction-report.json
// ==========================================================

import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { extractPage } from '../lib/bulletin-import/extract.js';
import { decideRows } from '../lib/bulletin-import/decide.js';
import { seedMappings } from '../lib/bulletin-import/seed-mappings.js';
import { compareWithManual } from '../lib/bulletin-import/verify.js';

const [file, ...rest] = process.argv.slice(2);
if (!file) {
  console.error('الاستخدام: node scripts/verify-bulletin-extraction.mjs <ملف.pdf> [--pages 3,5]');
  process.exit(1);
}
const pagesArg = rest[rest.indexOf('--pages') + 1];
const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true });
const pages = rest.includes('--pages') ? pagesArg.split(',').map(Number) : doc.getPageIndices().map(i => i + 1);

const rows = [];
const failures = [];
let usage = { input: 0, output: 0 };
for (const n of pages) {
  const one = await PDFDocument.create();
  const [p] = await one.copyPages(doc, [n - 1]);
  one.addPage(p);
  const t0 = Date.now();
  try {
    const res = await extractPage(Buffer.from(await one.save()).toString('base64'), n);
    rows.push(...res.rows);
    for (const u of res.usage) { usage.input += u.input; usage.output += u.output; }
    const flagged = res.rows.filter(r => r.flags.length).length;
    console.log(`ص ${n}: ${res.rows.length} سطر، ${flagged} عليها علامات — ${((Date.now() - t0) / 1000).toFixed(0)} ث`);
  } catch (e) {
    failures.push({ page: n, error: e.message });
    console.log(`ص ${n}: فشلت — ${e.message}`);
  }
}

const decided = decideRows(rows, { mappings: seedMappings() });
const report = compareWithManual(decided, pages);

console.log('\n===== المقارنة بالنقل اليدوي (نشرة يونيو 2026) =====');
console.log(`بنود يدوية في الصفحات دي: ${report.expected}`);
console.log(`مطابقة تماماً (سعر + وحدة + تصنيف): ${report.exact}`);
for (const m of report.mismatches) console.log(`✗ ص ${m.page} «${m.name}»: ${m.problem}`);
console.log('\n===== علامات المراجعة =====');
for (const [flag, count] of Object.entries(report.flagCounts)) console.log(`${flag}: ${count}`);
console.log(`\nإجمالي السطور: ${rows.length} · للكتالوج: ${decided.filter(r => r.decision.use === 'product').length} · مرجعي: ${decided.filter(r => r.decision.use === 'benchmark').length}`);
console.log(`التوكنز: ${usage.input} داخل / ${usage.output} خارج`);
if (failures.length) console.log(`صفحات فشلت: ${failures.map(f => f.page).join(', ')}`);

fs.writeFileSync('bulletin-extraction-report.json', JSON.stringify({ report, failures, usage, rows: decided }, null, 2));
console.log('التفاصيل: bulletin-extraction-report.json');
process.exit(report.mismatches.length || failures.length ? 1 : 0);
