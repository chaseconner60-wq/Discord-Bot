const { getDueGiveaways } = require('./giveawayStore');
const { endGiveaway } = require('./giveawayEngine');

const CHECK_INTERVAL_MS = 30 * 1000;

function startGiveawayScheduler(client) {
  setInterval(async () => {
    try {
      const due = await getDueGiveaways();
      for (const giveaway of due) {
        await endGiveaway(client, giveaway.id);
      }
    } catch (error) {
      console.error('Error in giveaway scheduler:', error);
    }
  }, CHECK_INTERVAL_MS);

  console.log('Giveaway scheduler started (checking every 30s).');
}

module.exports = { startGiveawayScheduler };
