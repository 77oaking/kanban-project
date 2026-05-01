import {
  renderInvitationEmail,
  renderMentionEmail,
} from '../src/services/email-templates.js';

describe('email templates', () => {
  test('invitation email contains inviter, workspace, and accept URL', () => {
    const out = renderInvitationEmail({
      inviterName: 'Demo Admin',
      workspaceName: 'FredoCloud HQ',
      acceptUrl: 'https://example.com/accept-invite?token=abc',
    });
    expect(out.subject).toContain('Demo Admin');
    expect(out.subject).toContain('FredoCloud HQ');
    expect(out.html).toContain('FredoCloud HQ');
    expect(out.html).toContain('https://example.com/accept-invite?token=abc');
    expect(out.text).toContain('Accept the invitation');
  });

  test('invitation email escapes HTML in inviter name (XSS)', () => {
    const out = renderInvitationEmail({
      inviterName: '<script>alert(1)</script>',
      workspaceName: 'HQ',
      acceptUrl: 'https://x',
    });
    // The literal "<script>" should not appear unescaped — entities only.
    expect(out.html).not.toContain('<script>alert(1)</script>');
    expect(out.html).toContain('&lt;script&gt;');
  });

  test('mention email includes the snippet and link', () => {
    const out = renderMentionEmail({
      mentionerName: 'Sam',
      workspaceName: 'HQ',
      snippet: 'hey @demo can you ship this?',
      link: 'https://example.com/announcements',
    });
    expect(out.subject).toContain('Sam');
    expect(out.html).toContain('hey @demo');
    expect(out.html).toContain('https://example.com/announcements');
  });
});
