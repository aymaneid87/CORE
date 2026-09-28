// ==========================================================
// قاعدة بيانات النسخة التجريبية: بتشتغل جوه المتصفح (localStorage) بدل Supabase
// بتنفّذ بالظبط الأوامر اللي الشاشات بتستخدمها: insert/update/eq/select/single
// ==========================================================

import { SAMPLE_PRODUCTS } from '../lib/estimation/sample-products.js';
import { bulletinProducts, bulletinBenchmarks, BULLETIN } from '../lib/estimation/bulletins/2026-06.js';
import { mergeCatalog } from '../lib/estimation/catalog.js';
import { defaultSpaceSelections } from '../lib/estimation/engine.js';

const KEY = 'mizan-demo-v1';
export const DEMO_USER = { id: 'demo-user', email: 'حساب تجريبي' };
const ESTIMATE_PRICE_DATE = '2026-09-01';
const TABLES = ['projects', 'transactions', 'estimates', 'estimate_versions', 'products', 'product_prices', 'suppliers'];

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const now = () => new Date().toISOString();

let memory = null; // لو التخزين مقفول (نافذة خاصة) البيانات بتفضل في الذاكرة لحد ما الصفحة تتقفل
export let storageAvailable = true;

function load() {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      memory = JSON.parse(raw);
      for (const t of TABLES) memory[t] ||= [];
      return memory;
    }
  } catch {
    storageAvailable = false;
  }
  memory = seed();
  persist();
  return memory;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { storageAvailable = false; }
}

export function resetDemo() {
  memory = seed();
  persist();
}

// ---------- محاكي supabase (الجزء المستخدم بس) ----------
class Query {
  constructor(table) { this.table = table; this.op = null; this.payload = null; this.filters = []; this.single = false; }
  insert(data) { this.op = 'insert'; this.payload = data; return this; }
  update(patch) { this.op = 'update'; this.payload = patch; return this; }
  select() { return this; }
  eq(col, val) { this.filters.push([col, val]); return this; }
  single() { this.single = true; return this; }
  then(resolve, reject) {
    try { resolve(this.run()); } catch (e) { reject ? reject(e) : resolve({ data: null, error: { message: e.message } }); }
  }
  run() {
    const db = load();
    const rows = db[this.table];
    if (!rows) return { data: null, error: { message: `جدول غير معروف: ${this.table}` } };
    if (this.op === 'insert') {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(r => ({
        id: uid(), created_at: now(), ...r,
        ...(r.owner_id === undefined && ['projects', 'estimates', 'products', 'product_prices', 'suppliers'].includes(this.table) ? { owner_id: DEMO_USER.id } : {}),
        ...(this.table === 'product_prices' && !r.effective_date ? { effective_date: now().slice(0, 10) } : {}),
      }));
      rows.push(...items);
      persist();
      return { data: this.single ? items[0] : items, error: null };
    }
    if (this.op === 'update') {
      const hit = rows.filter(r => this.filters.every(([c, v]) => r[c] === v));
      for (const r of hit) Object.assign(r, this.payload, { updated_at: now() });
      persist();
      return { data: this.single ? hit[0] || null : hit, error: null };
    }
    return { data: null, error: { message: 'عملية غير مدعومة في النسخة التجريبية' } };
  }
}

export function createClient() {
  return {
    from: table => new Query(table),
    rpc: async () => ({ data: null, error: { message: 'الخاصية دي محتاجة النسخة الكاملة على السيرفر' } }),
    auth: {
      getUser: async () => ({ data: { user: DEMO_USER } }),
      signOut: async () => ({ error: null }),
    },
  };
}

// ---------- "صفحات السيرفر" (نفس اللي بيعمله page.js في Next) ----------
export function loadDashboard() {
  const db = load();
  return [...db.projects]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(p => ({ ...p, transactions: db.transactions.filter(t => t.project_id === p.id) }));
}

export function loadProject(id) {
  const db = load();
  const p = db.projects.find(x => x.id === id);
  return p ? { ...p, transactions: db.transactions.filter(t => t.project_id === id) } : null;
}

export function loadCatalog() {
  const db = load();
  const today = now().slice(0, 10);
  const base = [
    ...SAMPLE_PRODUCTS.map(p => ({ ...p, owner_id: null, price_date: ESTIMATE_PRICE_DATE })),
    ...bulletinProducts().map(p => ({ ...p, owner_id: null })),
  ];
  const all = [...base, ...db.products];
  // آخر سعر ساري لكل منتج: أسعار الشركة أولاً، وإلا السعر الأساسي
  const own = new Map();
  for (const pr of db.product_prices) {
    if (!pr.approved || pr.effective_date > today) continue;
    const cur = own.get(pr.product_id);
    if (!cur || pr.effective_date > cur.effective_date || (pr.effective_date === cur.effective_date && pr.created_at > cur.created_at)) own.set(pr.product_id, pr);
  }
  const prices = all.map(p => own.get(p.id) || (p.price != null ? { product_id: p.id, price: p.price, effective_date: p.price_date || BULLETIN.effective_date } : null)).filter(Boolean);
  return mergeCatalog(all, prices);
}

export function loadEstimatePage(projectId) {
  const db = load();
  const project = db.projects.find(p => p.id === projectId);
  if (!project) return null;
  let estimate = db.estimates.filter(e => e.project_id === projectId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!estimate) {
    estimate = newEstimate(project);
    db.estimates.push(estimate);
    persist();
  }
  const versions = db.estimate_versions.filter(v => v.estimate_id === estimate.id).sort((a, b) => b.version - a.version);
  return {
    project: { id: project.id, name: project.name },
    estimate: structuredClone(estimate),
    catalog: loadCatalog(),
    benchmarks: bulletinBenchmarks().map(b => ({ ...b, effective_date: BULLETIN.effective_date })),
    versions,
  };
}

function newEstimate(project, extra = {}) {
  return {
    id: uid(), project_id: project.id, owner_id: DEMO_USER.id, title: `مقايسة ${project.name}`, unit_type: 'apartment', status: 'draft',
    spaces: [], selections: {}, settings: { overheadPct: 0, profitPct: 15, vatPct: 0, defaultHeight: 3, region: 'cairo' },
    totals: null, created_at: now(), updated_at: now(), ...extra,
  };
}

// ---------- بيانات تجريبية: شقة 3 غرف جاهزة ----------
function seed() {
  const db = Object.fromEntries(TABLES.map(t => [t, []]));
  const project = { id: uid(), owner_id: DEMO_USER.id, name: 'شقة تجريبية — التجمع الخامس (3 غرف نوم)', status: 'قيد التنفيذ', stage: 2, total_stages: 6, fees_pct: 10, created_at: now() };
  db.projects.push(project);
  db.transactions.push(
    { id: uid(), project_id: project.id, item: 'دفعة مقدمة من العميل', amount: 250000, category: null, created_at: now() },
    { id: uid(), project_id: project.id, item: 'مواسير وخامات تأسيس سباكة', amount: -18500, category: 'سباكة', created_at: now() },
  );

  const door = (w = 0.9) => ({ type: 'door', width: w, height: 2.2, sill: 0, count: 1 });
  const win = (w = 1.4, h = 1.4) => ({ type: 'window', width: w, height: h, sill: 1.0, count: 1 });
  const S = (name, type, length, width, openings) => ({ id: uid(), name, type, shape: 'rect', length, width, height: 3, openings });
  const spaces = [
    S('ريسبشن', 'reception', 7.2, 4.8, [{ ...door(1.2) }, win(2.4, 1.6), win(1.6, 1.6)]),
    S('غرفة نوم رئيسية', 'bedroom', 4.6, 4.0, [door(), win(1.8, 1.4)]),
    S('غرفة نوم 2', 'bedroom', 3.8, 3.4, [door(), win()]),
    S('غرفة نوم أطفال', 'bedroom', 3.4, 3.2, [door(), win()]),
    S('حمام رئيسي', 'bathroom', 2.6, 2.2, [door(0.8), { type: 'window', width: 0.6, height: 0.6, sill: 1.8, count: 1 }]),
    S('حمام ضيوف', 'bathroom', 1.8, 1.5, [door(0.7)]),
    S('مطبخ', 'kitchen', 3.6, 3.0, [door(), win(1.2, 1.0)]),
    S('طرقة', 'corridor', 5.0, 1.3, []),
  ];
  const selections = Object.fromEntries(spaces.map(s => [s.id, defaultSpaceSelections(s.type)]));
  const [reception, master, , , mainBath, guestBath, kitchen] = spaces;
  selections[reception.id].ceiling_finish.groups.cornice = 'gypsum';
  selections[master.id].floor_finish.groups = { floor_type: 'hdf', skirting: 'hdf' };
  Object.assign(selections[mainBath.id].bathroom_plumbing.groups, {
    toilet: 'wall_hung', basin: 'vanity', basin_mixer: 'deck', shower: 'shower', shower_base: 'tiled', shower_mixer: 'concealed', shower_enclosure: 'glass', water_heater: 'none',
  });
  Object.assign(selections[guestBath.id].bathroom_plumbing.groups, { toilet: 'floor', basin: 'wall_hung', shower: 'none' });
  Object.assign(selections[kitchen.id].kitchen_plumbing.groups, { washing_machine: 'yes', dishwasher: 'yes' });

  db.estimates.push(newEstimate(project, { spaces, selections }));
  db.projects.push({ id: uid(), owner_id: DEMO_USER.id, name: 'فيلا الشيخ زايد (مشروع جديد)', status: 'قيد التنفيذ', stage: 1, total_stages: 6, fees_pct: 10, created_at: new Date(Date.now() - 86400000).toISOString() });
  return db;
}
