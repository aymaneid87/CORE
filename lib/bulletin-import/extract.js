// ==========================================================
// قراءة صفحة من نشرة الأسعار بالذكاء الاصطناعي (سيرفر فقط — بيستخدم ANTHROPIC_API_KEY)
// الصفحة بتتقري مرتين مستقلتين، والاختلافات بتتعلّم للمراجعة البشرية.
// ==========================================================

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { CATEGORIES } from '../estimation/categories.js';
import { BENCHMARK_DEFS } from '../estimation/bulletins/2026-06.js';
import { normalizeRow, mergePasses } from './decide.js';

export const MODEL = 'claude-opus-5-5';

const CATEGORY_CODES = CATEGORIES.map(c => c.code);
const BENCHMARK_CODES = Object.keys(BENCHMARK_DEFS);

const PageSchema = z.object({
  page_title: z.string().nullable(),
  rows: z.array(z.object({
    section: z.string(),
    name: z.string(),
    unit: z.string(),
    price_text: z.string(),
    price: z.number(),
    unreadable: z.boolean(),
    suggested_category: z.enum([...CATEGORY_CODES, 'none']),
    suggested_benchmark: z.enum([...BENCHMARK_CODES, 'none']),
  })),
});

const SYSTEM = `You transcribe Egyptian building-materials price bulletins (Arabic, scanned tables) into structured rows for a finishing-contractor's price database. Accuracy of every digit matters more than speed: a wrong price propagates into client quotations.

Transcription rules:
- One output row per priced table row on this page. Skip section headers, column headers, and empty rows.
- "name": the item text exactly as printed (Arabic as-is, keep dimensions like 25*50سم, keep region words like بالقاهرة / بالصعيد). Do not translate, summarize, or merge rows.
- "section": the nearest section header above the row on this page (e.g. "سيراميك حوائط"). If the page continues a table from a previous page with no header above the row, use the page's top title.
- "unit": the unit cell exactly as printed (e.g. م2, م.ط, عدد, طن, لتر, كجم).
- "price_text": the price cell exactly as printed, digits only as they appear. "price": the same value as a number. Never compute, round, or correct a price.
- If a price cell is illegible or ambiguous, set unreadable=true, price=0 and put your best reading in price_text. Never guess silently.

Classification (a suggestion only — a human reviews every suggestion, and code rejects unit mismatches):
- suggested_category: the finishing category below only if the row is the same kind of item priced in the same measure unit (the unit after "/" must match the row's unit: m² for per-square-metre items, m.l for per-linear-metre, count for pieces). Labor rows (مصنعيات) map only to labor_* categories; material rows only to material categories. Supply-and-install rows map only where the category says توريد وتركيب. If unsure, use "none".
- suggested_benchmark: "interior_plastic_paint" only for supply-and-apply interior plastic paint priced per m² (توريد وعمل دهانات بلاستيك داخلية). Otherwise "none".

Categories (code: title / unit):
${CATEGORIES.map(c => `${c.code}: ${c.title} / ${c.measure_unit}`).join('\n')}`;

const PASS_HINTS = [
  'Read the table from top to bottom.',
  'For an independent second reading: first read the price column from the bottom of the page upward, then match each price to its row; output rows in top-to-bottom order.',
];

let client;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY مش متعرّف على السيرفر — ضيفه في متغيرات البيئة');
  }
  client ||= new Anthropic({ timeout: 10 * 60 * 1000 });
  return client;
}

async function readPass(pdfBase64, pass) {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: betaZodOutputFormat(PageSchema) },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
        { type: 'text', text: `Transcribe every priced row on this page. ${PASS_HINTS[pass]}` },
      ],
    }],
  });
  if (response.stop_reason === 'refusal') throw new Error('الموديل رفض قراءة الصفحة');
  if (response.stop_reason === 'max_tokens') throw new Error('الصفحة طويلة جداً — الرد اتقطع');
  if (!response.parsed_output) throw new Error('الرد مش بالشكل المطلوب');
  return { data: response.parsed_output, usage: response.usage };
}

/** قراءتين مستقلتين للصفحة ودمجهم */
export async function extractPage(pdfBase64, pageNumber) {
  const [a, b] = await Promise.all([readPass(pdfBase64, 0), readPass(pdfBase64, 1)]);
  const rows = mergePasses(
    a.data.rows.map(r => normalizeRow(r, pageNumber)),
    b.data.rows.map(r => normalizeRow(r, pageNumber)),
  );
  return {
    page: pageNumber,
    title: a.data.page_title || b.data.page_title,
    rows,
    usage: [a.usage, b.usage].map(u => ({ input: u.input_tokens, output: u.output_tokens })),
  };
}
