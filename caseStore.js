// In-memory case log, keyed per server, with auto-incrementing case numbers.
// NOTE: Resets on every Railway redeploy/restart, same as warningStore and configStore.
// Ask Claude to wire up a real database if you want this to survive restarts.

const casesByGuild = new Map(); // guildId -> array of case objects
const counters = new Map(); // guildId -> next case number

function nextCaseNumber(guildId) {
  const current = counters.get(guildId) ?? 1;
  counters.set(guildId, current + 1);
  return current;
}

function addCase(guildId, { type, targetId, targetTag, moderatorTag, reason, extra }) {
  const caseNumber = nextCaseNumber(guildId);
  const record = {
    caseNumber,
    type, // 'Kick' | 'Ban' | 'Warn' | 'Promote' | 'Demote'
    targetId,
    targetTag,
    moderatorTag,
    reason: reason || 'No reason provided',
    extra: extra || null,
    timestamp: Date.now(),
  };

  const list = casesByGuild.get(guildId) ?? [];
  list.push(record);
  casesByGuild.set(guildId, list);

  return record;
}

function getCase(guildId, caseNumber) {
  const list = casesByGuild.get(guildId) ?? [];
  return list.find(c => c.caseNumber === caseNumber) ?? null;
}

function getCasesForUser(guildId, userId) {
  const list = casesByGuild.get(guildId) ?? [];
  return list.filter(c => c.targetId === userId);
}

function editCaseReason(guildId, caseNumber, newReason) {
  const record = getCase(guildId, caseNumber);
  if (!record) return null;
  record.reason = newReason;
  return record;
}

function deleteCase(guildId, caseNumber) {
  const list = casesByGuild.get(guildId) ?? [];
  const index = list.findIndex(c => c.caseNumber === caseNumber);
  if (index === -1) return false;
  list.splice(index, 1);
  return true;
}

module.exports = { addCase, getCase, getCasesForUser, editCaseReason, deleteCase };
