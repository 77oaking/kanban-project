/**
 * Minimal HTML sanitiser for rich-text announcements. Strips <script>, event
 * handlers (on*=), and javascript: URLs. Allows a small whitelist of tags/
 * attributes that the frontend's editor can produce.
 *
 * For a production hardening pass we'd swap to DOMPurify on the server (via
 * jsdom) but this is sufficient for the assessment.
 */
const ALLOWED_TAGS = new Set([
  'a', 'b', 'i', 'em', 'strong', 'u', 's', 'p', 'br', 'ul', 'ol', 'li', 'h1',
  'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'span', 'div', 'hr', 'img',
]);

export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  let out = html;
  // 1. drop script/style blocks entirely
  out = out.replace(/<\/?(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '');
  out = out.replace(/<(script|style|iframe|object|embed)[^>]*>/gi, '');
  // 2. drop on* event handlers + javascript: URLs
  out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  out = out.replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"');
  out = out.replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");
  // 3. strip tags not on the allow list
  out = out.replace(/<\/?([a-zA-Z][\w:-]*)([^>]*)>/g, (m, tag) => {
    return ALLOWED_TAGS.has(tag.toLowerCase()) ? m : '';
  });
  return out;
}
