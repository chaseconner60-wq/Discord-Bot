const { AttachmentBuilder } = require('discord.js');

const MAX_MESSAGES = 500; // Safety cap so huge tickets don't take forever to fetch.
const GROUP_WINDOW_MS = 7 * 60 * 1000; // Messages from the same author within 7 min are visually grouped, like Discord does.

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Replaces raw <@id>, <#id>, <@&id> mention syntax with readable @name / #channel text.
function resolveMentions(message) {
  let content = message.content || '';

  message.mentions.users.forEach(user => {
    content = content.replace(new RegExp(`<@!?${user.id}>`, 'g'), `@${user.username}`);
  });
  message.mentions.channels?.forEach(channel => {
    content = content.replace(new RegExp(`<#${channel.id}>`, 'g'), `#${channel.name || 'channel'}`);
  });
  message.mentions.roles.forEach(role => {
    content = content.replace(new RegExp(`<@&${role.id}>`, 'g'), `@${role.name}`);
  });

  return content;
}

// Applies basic Discord-flavored markdown on top of already-escaped HTML.
function renderMarkdown(escaped) {
  let html = escaped;

  // Code blocks first, so nothing inside them gets further formatted.
  const codeBlocks = [];
  html = html.replace(/```(?:\w+\n)?([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code);
    return `\u0000CODEBLOCK${codeBlocks.length - 1}\u0000`;
  });

  const inlineCode = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    inlineCode.push(code);
    return `\u0000INLINECODE${inlineCode.length - 1}\u0000`;
  });

  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n/g, '<br>');

  html = html.replace(/\u0000INLINECODE(\d+)\u0000/g, (_, i) => `<code>${inlineCode[i]}</code>`);
  html = html.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (_, i) => `<pre><code>${codeBlocks[i]}</code></pre>`);

  return html;
}

function renderAttachments(message) {
  return [...message.attachments.values()]
    .map(a => {
      if (a.contentType?.startsWith('image/')) {
        return `<div class="attachment-image"><img src="${a.url}" alt="${escapeHtml(a.name)}" loading="lazy"></div>`;
      }
      return `<div class="attachment-file">📎 <a href="${a.url}" target="_blank">${escapeHtml(a.name)}</a></div>`;
    })
    .join('');
}

function renderEmbeds(message) {
  return message.embeds
    .map(e => {
      const color = e.color ? `#${e.color.toString(16).padStart(6, '0')}` : '#2DD4BF';
      const title = e.title
        ? `<div class="embed-title">${e.url ? `<a href="${e.url}" target="_blank">${escapeHtml(e.title)}</a>` : escapeHtml(e.title)}</div>`
        : '';
      const description = e.description ? `<div class="embed-desc">${renderMarkdown(escapeHtml(e.description))}</div>` : '';
      const fields = (e.fields || [])
        .map(f => `<div class="embed-field"><div class="embed-field-name">${escapeHtml(f.name)}</div><div>${escapeHtml(f.value)}</div></div>`)
        .join('');
      return `<div class="embed" style="border-left-color: ${color}">${title}${description}${fields}</div>`;
    })
    .join('');
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

// Groups consecutive messages from the same author (within the time window)
// into one block, so the avatar/name only appears once per group.
function groupMessages(messages) {
  const groups = [];

  for (const message of messages) {
    const last = groups[groups.length - 1];
    const sameAuthor = last && last.authorId === message.author.id;
    const withinWindow = last && message.createdTimestamp - last.lastTimestamp < GROUP_WINDOW_MS;

    const line = {
      time: new Date(message.createdTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      content: message.content ? renderMarkdown(escapeHtml(resolveMentions(message))) : '',
      attachments: renderAttachments(message),
      embeds: renderEmbeds(message),
    };

    if (sameAuthor && withinWindow) {
      last.lines.push(line);
      last.lastTimestamp = message.createdTimestamp;
    } else {
      groups.push({
        authorId: message.author.id,
        authorTag: message.author.tag,
        authorAvatar: message.author.displayAvatarURL({ size: 64 }),
        firstTimestamp: message.createdTimestamp,
        lastTimestamp: message.createdTimestamp,
        lines: [line],
      });
    }
  }

  return groups;
}

async function buildTranscript(channel, { ticketNumber, openerTag, guild }) {
  const messages = await fetchAllMessages(channel);
  const groups = groupMessages(messages);

  const groupsHtml = groups
    .map(group => {
      const headerTime = new Date(group.firstTimestamp).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      });

      const linesHtml = group.lines
        .map((line, i) => {
          const timeLabel = i === 0 ? headerTime : `<span class="line-time">${line.time}</span>`;
          return `
            <div class="line">
              ${i === 0 ? '' : timeLabel}
              <div class="line-content">
                ${line.content ? `<div class="text">${line.content}</div>` : ''}
                ${line.attachments}
                ${line.embeds}
              </div>
            </div>`;
        })
        .join('');

      return `
        <div class="group">
          <img class="avatar" src="${group.authorAvatar}" alt="">
          <div class="group-body">
            <div class="group-header">
              <span class="author">${escapeHtml(group.authorTag)}</span>
              <span class="time">${headerTime}</span>
            </div>
            ${linesHtml}
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
  * { box-sizing: border-box; }
  body {
    background: #0B1730;
    color: #E2E8F0;
    font-family: "gg sans", "Segoe UI", -apple-system, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 32px;
    line-height: 1.5;
    max-width: 820px;
    margin: 0 auto;
  }
  .header {
    border-bottom: 2px solid #2DD4BF;
    padding-bottom: 18px;
    margin-bottom: 24px;
  }
  .header h1 { margin: 0 0 6px 0; color: #5EEAD4; font-size: 24px; }
  .header p { margin: 0; color: #94A3B8; font-size: 14px; }

  .group { display: flex; gap: 14px; padding: 10px 0; }
  .avatar { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
  .group-body { flex: 1; min-width: 0; }
  .group-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }
  .author { font-weight: 700; color: #5EEAD4; font-size: 15px; }
  .time { font-size: 11.5px; color: #64748B; }

  .line { display: flex; gap: 8px; }
  .line-time {
    font-size: 10.5px;
    color: #475569;
    width: 34px;
    flex-shrink: 0;
    padding-top: 3px;
    opacity: 0;
    transition: opacity 0.1s;
  }
  .line:hover .line-time { opacity: 1; }
  .line-content { flex: 1; min-width: 0; }
  .text { word-wrap: break-word; white-space: normal; font-size: 15px; }
  .text code { background: #1E293B; padding: 1px 5px; border-radius: 4px; font-family: Consolas, monospace; font-size: 13px; }
  .text pre { background: #1E293B; padding: 10px 12px; border-radius: 6px; overflow-x: auto; margin: 6px 0; }
  .text pre code { background: none; padding: 0; }
  .text blockquote { border-left: 3px solid #475569; margin: 4px 0; padding-left: 10px; color: #94A3B8; }

  .attachment-image img { max-width: 380px; max-height: 300px; border-radius: 8px; margin-top: 6px; display: block; }
  .attachment-file { margin-top: 4px; font-size: 13px; }
  .attachment-file a { color: #5EEAD4; text-decoration: none; }
  .attachment-file a:hover { text-decoration: underline; }

  .embed {
    border-left: 4px solid #2DD4BF;
    background: #111C36;
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 6px;
    max-width: 480px;
  }
  .embed-title { font-weight: 700; margin-bottom: 4px; }
  .embed-title a { color: #5EEAD4; text-decoration: none; }
  .embed-desc { font-size: 14px; color: #CBD5E1; }
  .embed-field { margin-top: 6px; font-size: 13px; }
  .embed-field-name { font-weight: 600; color: #94A3B8; }

  .muted { color: #64748B; font-style: italic; }
</style>
</head>
<body>
  <div class="header">
    <h1>🎫 Ticket #${ticketNumber}</h1>
    <p>${escapeHtml(guild.name)} • Opened by ${escapeHtml(openerTag)} • ${messages.length} message(s)${messages.length >= MAX_MESSAGES ? ' (truncated at ' + MAX_MESSAGES + ')' : ''}</p>
  </div>
  ${groupsHtml || '<p class="muted">No messages were sent in this ticket.</p>'}
</body>
</html>`;

  return new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `ticket-${ticketNumber}-transcript.html` });
}

module.exports = { buildTranscript };
