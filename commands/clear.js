const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete recent messages in this channel')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    // Discord only allows bulk-deleting messages younger than 14 days.
    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    let toDelete = messages;

    if (targetUser) {
      toDelete = messages.filter(m => m.author.id === targetUser.id);
    }
    toDelete = [...toDelete.values()].slice(0, amount);

    const deleted = await interaction.channel.bulkDelete(toDelete, true);
    await interaction.editReply(`🧹 Deleted ${deleted.size} message(s).`);
  },
};
