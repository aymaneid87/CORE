'use client';
import { useEffect, useState } from 'react';
import DashboardClient from '../app/dashboard/DashboardClient';
import ProjectClient from '../app/project/[id]/ProjectClient';
import EstimateClient from '../app/project/[id]/estimate/EstimateClient';
import CatalogClient from '../app/catalog/CatalogClient';
import { BRAND } from '../lib/brand';
import { DEMO_USER, loadDashboard, loadProject, loadEstimatePage, loadCatalog, resetDemo, storageAvailable } from './local-db';
import { setNavigator } from './navigation-shim';

// التنقل جوه الصفحة (بدون تغيير الرابط): أي رابط داخلي /dashboard أو /project/... بيتحوّل هنا
function routeOf(path) {
  const clean = (path || '/').split('?')[0].replace(/\/+$/, '') || '/';
  let m;
  if ((m = clean.match(/^\/project\/([^/]+)\/estimate$/))) return { name: 'estimate', id: m[1] };
  if ((m = clean.match(/^\/project\/([^/]+)$/))) return { name: 'project', id: m[1] };
  if (clean.startsWith('/catalog/bulletins')) return { name: 'bulletins' };
  if (clean === '/catalog') return { name: 'catalog' };
  return { name: 'dashboard' };
}

export default function App() {
  const [route, setRoute] = useState({ name: 'dashboard' });
  const [version, setVersion] = useState(0); // بيجبر إعادة تحميل الشاشة من البيانات
  const [confirmReset, setConfirmReset] = useState(false);

  const go = path => { setRoute(routeOf(path)); setVersion(v => v + 1); window.scrollTo(0, 0); };

  useEffect(() => {
    setNavigator(go);
    const onClick = e => {
      const a = e.target.closest?.('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      e.preventDefault();
      go(href);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  let page;
  if (route.name === 'project') {
    const project = loadProject(route.id);
    page = project ? <ProjectClient key={version} project={project} /> : <Missing />;
  } else if (route.name === 'estimate') {
    const d = loadEstimatePage(route.id);
    page = d
      ? <EstimateClient key={version} project={d.project} initialEstimate={d.estimate} catalog={d.catalog} benchmarks={d.benchmarks} initialVersions={d.versions} printable={false} />
      : <Missing />;
  } else if (route.name === 'catalog') {
    page = <CatalogClient key={version} initialCatalog={loadCatalog()} suppliers={[]} userId={DEMO_USER.id} />;
  } else if (route.name === 'bulletins') {
    page = (
      <div className="max-w-lg mx-auto px-5 py-16 text-center">
        <h1 className="font-head font-bold text-lg mb-2">استيراد نشرات الأسعار (PDF)</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>
          الخاصية دي بتقرا ملف النشرة بالذكاء الاصطناعي، وبتحتاج النسخة الكاملة على السيرفر ومفتاح Anthropic API.
          في النسخة التجريبية تقدر تعدّل الأسعار يدوياً أو بنسبة من صفحة الكتالوج.
        </p>
        <a href="/catalog" className="font-bold text-sm" style={{ color: 'var(--teal)' }}>← رجوع للكتالوج</a>
      </div>
    );
  } else {
    page = <DashboardClient key={version} initialProjects={loadDashboard()} userEmail={DEMO_USER.email} />;
  }

  return (
    <>
      <div className="px-4 py-2 text-xs flex flex-wrap items-center gap-x-3 gap-y-1" style={{ backgroundColor: 'var(--teal)', color: 'var(--card)' }}>
        <b>{BRAND.name} · نسخة تجريبية</b>
        <span style={{ opacity: 0.8 }}>
          {storageAvailable ? 'البيانات بتتحفظ على جهازك بس' : 'الحفظ مقفول في المتصفح ده — البيانات هتتمسح لما تقفل الصفحة'}
        </span>
        <span className="mr-auto flex gap-3">
          <a href="/dashboard" className="font-bold" style={{ color: 'var(--card)' }}>المشاريع</a>
          <a href="/catalog" className="font-bold" style={{ color: 'var(--card)' }}>الخامات والأسعار</a>
          <button type="button" className="font-bold underline"
            onClick={() => {
              if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
              resetDemo(); setConfirmReset(false); go('/dashboard');
            }}>
            {confirmReset ? 'اضغط تاني لمسح كل تعديلاتك' : 'إعادة البيانات التجريبية'}
          </button>
        </span>
      </div>
      {page}
    </>
  );
}

function Missing() {
  return (
    <div className="max-w-lg mx-auto px-5 py-16 text-center">
      <p className="text-sm mb-4" style={{ color: 'var(--ink-soft)' }}>الصفحة دي مش موجودة — ممكن تكون البيانات اتمسحت.</p>
      <a href="/dashboard" className="font-bold text-sm" style={{ color: 'var(--teal)' }}>← المشاريع</a>
    </div>
  );
}
