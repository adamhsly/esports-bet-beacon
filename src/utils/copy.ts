// src/utils/copy.ts
export async function copyToClipboard(text: string): Promise<boolean> {
  const canUseClipboardAPI =
    typeof navigator !== 'undefined' &&
    !!navigator.clipboard &&
    window.isSecureContext &&
    document.hasFocus?.();

  if (canUseClipboardAPI) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to fallback
    }
  }

  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
