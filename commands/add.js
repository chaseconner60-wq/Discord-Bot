const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicketByChannel } = require('../ticketStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to this ticket')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to add').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const ticket = await getTicketByChannel(interaction.guild.id, interaction.channel.id);
    if (!ticket) {
      return interaction.reply({ content: 'This command only works inside a ticket channel.', ephemeral: true });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: 'This ticket is already closed.', ephemeral: true });
    }

    const target = interaction.options.getUser('user');

    await interaction.channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.reply(`➕ Added ${target} to this ticket.`);
  },
};
