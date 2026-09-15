const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

// Accepts combos like "10m", "2h", "1d12h", "1w". Returns milliseconds, or null if invalid.
function parseDuration(input) {
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, '');
  const matches = [...cleaned.matchAll(/(\d+)(s|m|h|d|w)/g)];

  if (matches.length === 0) return null;

  // Make sure the whole string was consumed by matches (catches typos like "10x").
  const reconstructed = matches.map(m => m[0]).join('');
  if (reconstructed !== cleaned) return null;

  let totalMs = 0;
  for (const [, amount, unit] of matches) {
    totalMs += parseInt(amount, 10) * UNIT_MS[unit];
  }

  return totalMs;
}

module.exports = { parseDuration };
