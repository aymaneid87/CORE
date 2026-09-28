// بديل next/navigation في النسخة التجريبية
let navigate = () => {};
export function setNavigator(fn) { navigate = fn; }
export function useRouter() {
  return { push: path => navigate(path), replace: path => navigate(path), refresh: () => {}, back: () => navigate('/dashboard') };
}
export function notFound() { throw new Error('not found'); }
