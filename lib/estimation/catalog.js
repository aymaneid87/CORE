// دمج المنتجات مع آخر سعر معتمد لكل منتج + قواعد أولوية المنتج الافتراضي
export const PRICE_STALE_DAYS = 45;

export function mergeCatalog(products, currentPrices, today = new Date()) {
  const priceBy = new Map((currentPrices || []).map(p => [p.product_id, p]));
  // لو الشركة عرّفت منتج افتراضي خاص بيها في تصنيف، الافتراضي العام (التقديري) بيتلغي
  const ownDefaultCats = new Set((products || []).filter(p => p.owner_id && p.is_default && p.active !== false).map(p => p.category_code));
  return (products || [])
    .filter(p => p.active !== false)
    .map(p => {
      const cp = priceBy.get(p.id);
      const priceDate = cp?.effective_date || null;
      const ageDays = priceDate ? Math.floor((today - new Date(priceDate)) / 86400000) : null;
      return {
        ...p,
        coverage: Number(p.coverage) || 1,
        is_default: !!p.is_default && (!!p.owner_id || !ownDefaultCats.has(p.category_code)),
        price: cp ? Number(cp.price) : null,
        price_date: priceDate,
        price_stale: ageDays != null && ageDays > PRICE_STALE_DAYS,
      };
    });
}

export function productLabel(p) {
  return [p.brand, p.model, '—', p.name].filter(Boolean).join(' ');
}
