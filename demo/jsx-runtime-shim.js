// react/jsx-runtime فوق React العام (UMD من cdnjs)
const R = window.React;
export const Fragment = R.Fragment;
export function jsx(type, props, key) {
  return R.createElement(type, key === undefined ? props : { ...props, key });
}
export const jsxs = jsx;
