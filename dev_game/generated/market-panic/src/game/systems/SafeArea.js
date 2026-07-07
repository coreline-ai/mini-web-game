export function cssInset(name) {
  if (typeof window === 'undefined') return 0;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding:' + name + ';';
  document.body.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return value;
}

export function safeTop(defaultPad = 24) { return Math.max(defaultPad, cssInset('env(safe-area-inset-top)')); }
export function safeBottom(defaultPad = 24) { return Math.max(defaultPad, cssInset('env(safe-area-inset-bottom)')); }
