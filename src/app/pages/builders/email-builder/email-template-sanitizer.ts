import { SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

export type EmailBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'button' | 'divider';
  text: string;
  url?: string;
  richText?: string;
};

/** Email text stays text in Delta JSON; only link values enter a URL context. */
export function sanitizeEmailBlocks(blocks: readonly EmailBlock[], sanitizer: DomSanitizer): EmailBlock[] | null {
  if (blocks.length > 100 || blocks.filter(block => block.type === 'paragraph').length !== 1) return null;
  const safeUrl = (value: string): string | null => {
    const sanitized = sanitizer.sanitize(SecurityContext.URL, value);
    if (!sanitized || sanitized.startsWith('unsafe:')) return null;
    try {
      const url = new URL(sanitized);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  };
  const result: EmailBlock[] = [];
  for (const block of blocks) {
    if (!['heading', 'paragraph', 'button', 'divider'].includes(block.type) || typeof block.text !== 'string' || block.text.length > 10_000) return null;
    const safe: EmailBlock = { id: block.id, type: block.type, text: block.text };
    if (block.type === 'button' && block.url) {
      const url = safeUrl(block.url);
      if (!url) return null;
      safe.url = url;
    }
    if (block.type === 'paragraph' && block.richText) {
      if (block.richText.length > 20_000) return null;
      let parsed: unknown;
      try { parsed = JSON.parse(block.richText); } catch { return null; }
      if (!parsed || typeof parsed !== 'object' || !('ops' in parsed) || !Array.isArray(parsed.ops) || parsed.ops.length > 200) return null;
      let totalLength = 0;
      const ops: Array<{ insert: string; attributes?: Record<string, true | string | number> }> = [];
      for (const raw of parsed.ops as unknown[]) {
        if (!raw || typeof raw !== 'object' || !('insert' in raw) || typeof raw.insert !== 'string') return null;
        totalLength += raw.insert.length;
        if (totalLength > 10_000) return null;
        const op: { insert: string; attributes?: Record<string, true | string | number> } = { insert: raw.insert };
        if ('attributes' in raw) {
          if (!raw.attributes || typeof raw.attributes !== 'object' || Array.isArray(raw.attributes)) return null;
          const attributes: Record<string, true | string | number> = {};
          for (const [key, value] of Object.entries(raw.attributes)) {
            if (['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'].includes(key) && value === true) attributes[key] = true;
            else if (key === 'list' && (value === 'bullet' || value === 'ordered')) attributes[key] = value;
            else if (key === 'header' && (value === 1 || value === 2)) attributes[key] = value;
            else if (key === 'script' && (value === 'sub' || value === 'super')) attributes[key] = value;
            else if (key === 'indent' && typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 8) attributes[key] = value;
            else if (key === 'direction' && value === 'rtl') attributes[key] = value;
            else if (key === 'size' && (value === 'small' || value === 'large' || value === 'huge')) attributes[key] = value;
            else if ((key === 'color' || key === 'background') && typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)) attributes[key] = value;
            else if (key === 'font' && (value === 'serif' || value === 'monospace')) attributes[key] = value;
            else if (key === 'align' && (value === 'center' || value === 'right' || value === 'justify')) attributes[key] = value;
            else if (key === 'link' && typeof value === 'string') {
              const url = safeUrl(value);
              if (!url) return null;
              attributes[key] = url;
            } else return null;
          }
          if (Object.keys(attributes).length) op.attributes = attributes;
        }
        ops.push(op);
      }
      safe.richText = JSON.stringify({ ops });
    }
    result.push(safe);
  }
  return result;
}
