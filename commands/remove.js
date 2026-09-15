const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicketByChannel } = require('../ticketStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from this ticket')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to remove').setRequired(true)
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

    if (target.id === ticket.openerId) {
      return interaction.reply({
        content: 'You can\'t remove the person who opened the ticket. Close the ticket instead.',
        ephemeral: true,
      });
    }

    await interaction.channel.permissionOverwrites.delete(target.id);
    await interaction.reply(`➖ Removed ${target} from this ticket.`);
  },
};
