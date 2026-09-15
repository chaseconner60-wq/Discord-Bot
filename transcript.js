const { AttachmentBuilder } = require('discord.js');

const MAX_MESSAGES = 500; // Safety cap so huge tickets don't take forever to fetch.

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchAllMessages(channel) {
  let all = [];
  let lastId;

  while (all.length < MAX_MESSAGES) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;

    all = all.concat([...batch.values()]);
    lastId = batch.last().id;

    if (batch.size < 100) break;
  }

  return all.reverse(); // oldest first
}

async function buildTranscript(channel, { ticketNumber, openerTag, guild }) {
  const messages = await fetchAllMessages(channel);

  const rows = messages
    .map(m => {
      const time = new Date(m.createdTimestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      const avatar = m.author.displayAvatarURL({ size: 64 });
      const content = m.content ? escapeHtml(m.content).replace(/\n/g, '<br>') : '<span class="muted">[no text content]</span>';
      const attachments = [...m.attachments.values()]
        .map(a => `<div class="attachment">📎 <a href="${a.url}" target="_blank">${escapeHtml(a.name)}</a></div>`)
        .join('');

      return `
        <div class="message">
          <img class="avatar" src="${avatar}" alt="">
          <div class="body">
            <div class="meta"><span class="author">${escapeHtml(m.author.tag)}</span><span class="time">${time}</span></div>
            <div class="content">${content}</div>
            ${attachments}
          </div>
        </div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket #${ticketNumber} Transcript</title>
<style>
  body { background: #0B1730; color: #E2E8F0; font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; }
  .header { border-bottom: 2px solid #2DD4BF; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { margin: 0 0 4px 0; color: #5EEAD4; font-size: 22px; }
  .header p { margin: 0; color: #94A3B8; font-size: 14px; }
  .message { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #1E293B; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
  .meta { display: flex; gap: 8px; align-items: baseline; }
  .author { font-weight: 600; color: #5EEAD4; }
  .time { font-size: 12px; color: #64748B; }
  .content { margin-top: 2px; line-height: 1.5; word-wrap: break-word; }
  .muted { color: #64748B; font-style: italic; }
  .attachment { margin-top: 4px; font-size: 13px; }
  .attachment a { color: #5EEAD4; }
</style>
</head>
<body>
  <div class="header">
    <h1>Ticket #${ticketNumber}</h1>
    <p>${escapeHtml(guild.name)} • Opened by ${escapeHtml(openerTag)} • ${messages.length} message(s)${messages.length >= MAX_MESSAGES ? ' (truncated at ' + MAX_MESSAGES + ')' : ''}</p>
  </div>
  ${rows || '<p class="muted">No messages were sent in this ticket.</p>'}
</body>
</html>`;

  return new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `ticket-${ticketNumber}-transcript.html` });
}

module.exports = { buildTranscript };
