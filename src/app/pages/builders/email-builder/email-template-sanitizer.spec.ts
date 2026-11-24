import { describe, expect, it } from 'vitest';
import { SecurityContext } from '@angular/core';
import type { DomSanitizer } from '@angular/platform-browser';
import { sanitizeEmailBlocks } from './email-template-sanitizer';

const sanitizer = {
  sanitize: (context: SecurityContext, value: string) => context === SecurityContext.URL && /^https?:\/\//i.test(value) ? value : `unsafe:${value}`,
} as DomSanitizer;

describe('email template submission sanitizer', () => {
  it('normalizes safe Quill links before submission', () => {
    const richText = JSON.stringify({ ops: [{ insert: 'Open', attributes: { bold: true, link: 'https://example.com' } }] });
    const result = sanitizeEmailBlocks([{ id: 'one', type: 'paragraph', text: '', richText }], sanitizer);
    expect(JSON.parse(result![0].richText!)).toEqual({ ops: [{ insert: 'Open', attributes: { bold: true, link: 'https://example.com/' } }] });
  });
  it('rejects unsafe links and non-text embeds', () => {
    const link = JSON.stringify({ ops: [{ insert: 'Open', attributes: { link: 'javascript:alert(1)' } }] });
    const embed = JSON.stringify({ ops: [{ insert: { image: 'https://example.com/image.png' } }] });
    expect(sanitizeEmailBlocks([{ id: 'one', type: 'paragraph', text: '', richText: link }], sanitizer)).toBeNull();
    expect(sanitizeEmailBlocks([{ id: 'one', type: 'paragraph', text: '', richText: embed }], sanitizer)).toBeNull();
  });
  it('requires exactly one paragraph body', () => {
    const paragraph = { id: 'one', type: 'paragraph' as const, text: 'Hello' };
    expect(sanitizeEmailBlocks([], sanitizer)).toBeNull();
    expect(sanitizeEmailBlocks([paragraph, { ...paragraph, id: 'two' }], sanitizer)).toBeNull();
    expect(sanitizeEmailBlocks([paragraph], sanitizer)).not.toBeNull();
  });
});
