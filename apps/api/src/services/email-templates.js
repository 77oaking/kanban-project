// Email templates — small, brand-tinted, mobile-friendly. Pure functions of
// their input; tested in isolation without spinning up a transport.

const escapeHtml = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function shell({ heading, body, ctaLabel, ctaUrl, footer }) {
  const safeBody = body; // body is constructed by callers from escaped values
  const cta = ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
         <tr><td align="left">
           <a href="${ctaUrl}" style="display:inline-block;background:#7A1F2B;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;font-size:14px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">${escapeHtml(ctaLabel)}</a>
         </td></tr>
       </table>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <tr><td style="background:#7A1F2B;color:#fff;padding:18px 24px;font-weight:600;font-size:14px;letter-spacing:0.2px">FredoCloud Team Hub</td></tr>
        <tr><td style="padding:28px 24px">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#18181b">${escapeHtml(heading)}</h1>
          <div style="font-size:14px;line-height:1.55;color:#3f3f46">${safeBody}</div>
          ${cta}
          ${ctaUrl ? `<p style="font-size:12px;color:#71717a;margin:0">If the button doesn't work, paste this link: <a href="${ctaUrl}" style="color:#7A1F2B">${ctaUrl}</a></p>` : ''}
        </td></tr>
        <tr><td style="background:#fafafa;padding:14px 24px;color:#a1a1aa;font-size:12px;border-top:1px solid #f4f4f5">${escapeHtml(footer || 'Sent by FredoCloud Team Hub. You can change your notification settings inside the app.')}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function renderInvitationEmail({ inviterName, workspaceName, acceptUrl }) {
  const subject = `${inviterName} invited you to ${workspaceName}`;
  const html = shell({
    heading: `You're invited to ${escapeHtml(workspaceName)}`,
    body: `<p style="margin:0 0 12px"><strong>${escapeHtml(inviterName)}</strong> wants you to join <strong>${escapeHtml(workspaceName)}</strong> on FredoCloud Team Hub.</p>
           <p style="margin:0">Click below to accept and start collaborating.</p>`,
    ctaLabel: 'Accept invitation',
    ctaUrl: acceptUrl,
  });
  const text = `${inviterName} invited you to join "${workspaceName}" on FredoCloud Team Hub.\n\nAccept the invitation: ${acceptUrl}`;
  return { subject, html, text };
}

export function renderMentionEmail({ mentionerName, workspaceName, snippet, link }) {
  const subject = `${mentionerName} mentioned you in ${workspaceName}`;
  const html = shell({
    heading: `${escapeHtml(mentionerName)} mentioned you`,
    body: `<p style="margin:0 0 12px">In <strong>${escapeHtml(workspaceName)}</strong>:</p>
           <blockquote style="margin:0;padding:10px 14px;border-left:3px solid #7A1F2B;background:#fdf3f4;color:#52525b;font-size:13px;border-radius:0 4px 4px 0">${escapeHtml(snippet)}</blockquote>`,
    ctaLabel: 'Open thread',
    ctaUrl: link,
  });
  const text = `${mentionerName} mentioned you in "${workspaceName}":\n\n"${snippet}"\n\nOpen: ${link}`;
  return { subject, html, text };
}
