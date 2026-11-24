import { describe, it, expect } from 'vitest';
import { BlockPaginationService } from '@shared/components/block-pagination.service';
import { galleryUrl } from '@shared/components/gallery.component';
describe('gallery pagination', () => {
  it('clamps pages and keeps gallery states separate', () => {
    const paging = new BlockPaginationService(); paging.configure('a', 25, 12); paging.configure('b', 3, 12);
    paging.move('a', 99); expect(paging.state()['a'].page).toBe(3); expect(paging.state()['b'].page).toBe(1);
    paging.configure('a', 2, 12); expect(paging.state()['a'].page).toBe(1);
  });
  it('rejects unsafe image URLs', () => {
    expect(galleryUrl('/assets/logo.png')).toBe('/assets/logo.png');
    expect(galleryUrl('https://example.com/image.png')).toBeTruthy();
    for (const value of ['javascript:alert(1)', '//example.com/image', 'http://example.com/image']) expect(galleryUrl(value)).toBeNull();
  });
});
