import { sanitizeHtml } from '../src/lib/sanitize.js';

describe('sanitizeHtml', () => {
  test('strips <script> tags entirely', () => {
    const out = sanitizeHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).toBe('<p>hi</p>');
    expect(out).not.toMatch(/script/i);
  });

  test('strips on* event handlers', () => {
    const out = sanitizeHtml('<a href="#" onclick="x()">x</a>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).toMatch(/<a href="#">/);
  });

  test('rewrites javascript: URLs', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
    expect(out).toMatch(/href="#"/);
  });

  test('keeps allow-listed tags', () => {
    const html = '<p><strong>bold</strong> <em>italic</em></p><ul><li>item</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  test('strips disallowed tags but keeps inner text', () => {
    const out = sanitizeHtml('<marquee>nope</marquee>');
    expect(out).toBe('nope');
  });

  test('handles non-string input gracefully', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml(123)).toBe('');
  });

  test('strips iframe blocks including content', () => {
    const out = sanitizeHtml('<iframe src="evil.com">payload</iframe>');
    expect(out).not.toMatch(/iframe/i);
    expect(out).not.toMatch(/payload/);
  });
});
