'use client';
import { useMemo, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import { CATEGORIES, CATEGORY_GROUPS, CATEGORY_BY_CODE } from '../../lib/estimation/categories';
import { Card, Chip, Badge, Field, NumInput, Select, money } from '../project/[id]/estimate/ui';

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = code => ({ category_code: code, brand: '', model: '', name: '', unit: CATEGORY_BY_CODE[code].unit, coverage: 1, sold_by_pack: false, is_default: false, price: null });

export default function CatalogClient({ initialCatalog, suppliers, userId }) {
  const supabase = useMemo(() => createClient(), []);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [group, setGroup] = useState(Object.keys(CATEGORY_GROUPS)[0]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [priceEdit, setPriceEdit] = useState(null); // { product, price, supplier_id, effective_date }
  const [error, setError] = useState('');

  const cats = CATEGORIES.filter(c => c.group === group);
  const byCat = useMemo(() => {
    const m = {};
    const q = search.trim();
    for (const p of catalog) {
      if (q && !`${p.brand} ${p.model} ${p.name}`.includes(q)) continue;
      (m[p.category_code] ||= []).push(p);
    }
    return m;
  }, [catalog, search]);

  async function addProduct(e) {
    e.preventDefault();
    setError('');
    if (!form.brand.trim() || !form.name.trim()) { setError('الشركة واسم المنتج مطلوبين'); return; }
    if (!(form.coverage > 0)) { setError('التغطية لازم تكون أكبر من صفر'); return; }
    if (form.price == null) { setError('السعر مطلوب'); return; }
    const { price, ...product } = form;
    if (product.is_default) {
      const { error: e1 } = await supabase.from('products').update({ is_default: false })
        .eq('owner_id', userId).eq('category_code', product.category_code).eq('is_default', true);
      if (e1) { setError(e1.message); return; }
    }
    const { data, error: e2 } = await supabase.from('products').insert({ ...product, owner_id: userId }).select().single();
    if (e2) { setError(e2.message); return; }
    const { error: e3 } = await supabase.from('product_prices').insert({ owner_id: userId, product_id: data.id, price, effective_date: today(), approved: true });
    if (e3) { setError(e3.message); return; }
    setCatalog(prev => [
      ...prev.map(p => (product.is_default && p.category_code === product.category_code ? { ...p, is_default: false } : p)),
      { ...data, coverage: Number(data.coverage), price, price_date: today(), price_stale: false },
    ]);
    setForm(null);
  }

  async function savePrice(e) {
    e.preventDefault();
    setError('');
    const { product, price, supplier_id, effective_date } = priceEdit;
    if (price == null) { setError('السعر مطلوب'); return; }
    const { error: e1 } = await supabase.from('product_prices').insert({
      owner_id: userId, product_id: product.id, price, supplier_id: supplier_id || null, effective_date, approved: true,
    });
    if (e1) { setError(e1.message); return; }
    if (effective_date <= today()) {
      setCatalog(prev => prev.map(p => (p.id === product.id ? { ...p, price, price_date: effective_date, price_stale: false } : p)));
    }
    setPriceEdit(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-5 pb-16">
      <div className="pt-6 pb-4">
        <a href="/dashboard" className="text-xs" style={{ color: 'var(--ink-soft)' }}>← المشاريع</a>
        <h1 className="font-head font-bold text-lg mt-2">كتالوج الخامات والأسعار</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
          كل تعديل سعر بيتسجّل كسعر جديد بتاريخه — السعر القديم بيفضل في السجل، والمقايسات المعتمدة مش بتتأثر.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(CATEGORY_GROUPS).map(([k, v]) => <Chip key={k} active={group === k} onClick={() => setGroup(k)}>{v}</Chip>)}
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالشركة أو الموديل..."
        className="border rounded-xl px-4 py-2.5 text-sm w-full mb-4 outline-none" style={{ borderColor: 'var(--line)', backgroundColor: '#fff' }} />
      {error && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="flex flex-col gap-4">
        {cats.map(c => (
          <Card key={c.code}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-head font-bold text-sm">{c.title}</h3>
              <Badge>{c.unit}</Badge>
              {c.default_waste_pct > 0 && <Badge>هالك {c.default_waste_pct}%</Badge>}
              <button type="button" className="mr-auto text-xs font-bold" style={{ color: 'var(--teal)' }} onClick={() => setForm(emptyForm(c.code))}>+ منتج</button>
            </div>
            <div className="flex flex-col">
              {(byCat[c.code] || []).map(p => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm" style={{ borderTop: '1px solid var(--line)' }}>
                  <span className="font-bold">{p.brand}</span>
                  <span style={{ color: 'var(--ink-soft)' }}>{p.model}</span>
                  <span>{p.name}</span>
                  {p.coverage !== 1 && <span className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>(تغطية {p.coverage} {c.measure_unit}/{p.unit})</span>}
                  {p.is_default && <Badge tone="ok">افتراضي</Badge>}
                  {p.is_sample && <Badge tone="warn">تجريبي</Badge>}
                  {p.price_stale && <Badge tone="danger">سعر قديم</Badge>}
                  <span className="mr-auto font-head font-extrabold">{p.price == null ? '—' : money(p.price)} <span className="text-[11px] font-medium opacity-60">ج.م/{p.unit}</span></span>
                  <span className="text-[11px] w-20 text-left" style={{ color: 'var(--ink-soft)' }}>{p.price_date || ''}</span>
                  <button type="button" className="text-xs font-bold" style={{ color: 'var(--teal)' }}
                    onClick={() => setPriceEdit({ product: p, price: p.price, supplier_id: '', effective_date: today() })}>تحديث السعر</button>
                </div>
              ))}
              {!(byCat[c.code] || []).length && <p className="text-xs py-2" style={{ color: 'var(--ink-soft)' }}>لا توجد منتجات</p>}
            </div>
          </Card>
        ))}
      </div>

      {form && (
        <Modal title={`منتج جديد — ${CATEGORY_BY_CODE[form.category_code].title}`} onClose={() => setForm(null)}>
          <form onSubmit={addProduct} className="grid grid-cols-2 gap-3">
            <Field label="الشركة"><TextInput value={form.brand} onChange={brand => setForm({ ...form, brand })} /></Field>
            <Field label="الموديل"><TextInput value={form.model} onChange={model => setForm({ ...form, model })} /></Field>
            <Field label="اسم المنتج / الوصف" className="col-span-2"><TextInput value={form.name} onChange={name => setForm({ ...form, name })} /></Field>
            <Field label="وحدة التسعير"><TextInput value={form.unit} onChange={unit => setForm({ ...form, unit })} /></Field>
            <Field label={`التغطية (${CATEGORY_BY_CODE[form.category_code].measure_unit} لكل وحدة)`}>
              <NumInput value={form.coverage} onChange={coverage => setForm({ ...form, coverage })} />
            </Field>
            <Field label="السعر (ج.م)" className="col-span-2"><NumInput value={form.price} onChange={price => setForm({ ...form, price })} /></Field>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.sold_by_pack} onChange={e => setForm({ ...form, sold_by_pack: e.target.checked })} /> بيتباع بعبوات كاملة</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} /> المنتج الافتراضي للتصنيف</label>
            <button className="col-span-2 font-head font-bold text-white py-3 rounded-xl" style={{ backgroundColor: 'var(--teal)' }}>حفظ</button>
          </form>
        </Modal>
      )}

      {priceEdit && (
        <Modal title={`تحديث سعر: ${priceEdit.product.brand} ${priceEdit.product.name}`} onClose={() => setPriceEdit(null)}>
          <form onSubmit={savePrice} className="flex flex-col gap-3">
            <Field label={`السعر الجديد (ج.م/${priceEdit.product.unit})`}><NumInput value={priceEdit.price} onChange={price => setPriceEdit({ ...priceEdit, price })} /></Field>
            <Field label="ساري من">
              <input type="date" value={priceEdit.effective_date} onChange={e => setPriceEdit({ ...priceEdit, effective_date: e.target.value })}
                className="border rounded-lg px-2.5 py-2 text-sm" style={{ borderColor: 'var(--line)' }} />
            </Field>
            <Field label="المورد (اختياري)">
              <Select value={priceEdit.supplier_id} onChange={supplier_id => setPriceEdit({ ...priceEdit, supplier_id })}>
                <option value="">—</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <button className="font-head font-bold text-white py-3 rounded-xl" style={{ backgroundColor: 'var(--teal)' }}>حفظ السعر</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function TextInput({ value, onChange }) {
  return <input value={value} onChange={e => onChange(e.target.value)} className="border rounded-lg px-2.5 py-2 text-sm outline-none" style={{ borderColor: 'var(--line)', backgroundColor: '#fff' }} />;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: '#00000055' }} onClick={onClose}>
      <div className="w-full sm:w-[460px] rounded-t-3xl sm:rounded-3xl p-6" style={{ backgroundColor: 'var(--card)' }} onClick={e => e.stopPropagation()}>
        <h3 className="font-head font-bold text-base mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
