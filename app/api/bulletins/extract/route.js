import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { extractPage } from '../../../../lib/bulletin-import/extract';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_PAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'لازم تسجّل دخول' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 }); }
  const { pdf, page } = body || {};
  if (typeof pdf !== 'string' || !Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: 'بيانات الصفحة ناقصة' }, { status: 400 });
  }
  if (pdf.length * 0.75 > MAX_PAGE_BYTES) {
    return NextResponse.json({ error: 'الصفحة أكبر من 8 ميجا' }, { status: 413 });
  }

  try {
    return NextResponse.json(await extractPage(pdf, page));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'ضغط على خدمة الذكاء الاصطناعي — أعد المحاولة بعد دقيقة', retry: true }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: 'مفتاح Anthropic API غير صالح' }, { status: 500 });
    if (e instanceof Anthropic.BadRequestError) return NextResponse.json({ error: `الطلب اترفض: ${e.message}` }, { status: 400 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: `خطأ من الخدمة (${e.status})`, retry: true }, { status: 502 });
    return NextResponse.json({ error: e.message || 'خطأ غير متوقع', retry: true }, { status: 500 });
  }
}
