const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { getTicketConfig } = require('./configStore');
const { createTicket, getOpenTicketForUser, getTicketByChannel, claimTicket, closeTicket } = require('./ticketStore');
const { buildTranscript } = require('./transcript');

const BRAND_COLOR = 0x2dd4bf; // teal, matches the bot's logo

function ticketControlsRow(claimed) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(claimed ? 'Claimed' : 'Claim Ticket')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(claimed),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
  );
}

async function openTicket(interaction) {
  const guild = interaction.guild;
  const config = await getTicketConfig(guild.id);

  if (!config.categoryId || !config.supportRoleId) {
    return interaction.reply({
      content: 'Tickets aren\'t set up yet. Ask an admin to run `/ticketsetup` first.',
      ephemeral: true,
    });
  }

  const existing = await getOpenTicketForUser(guild.id, interaction.user.id);
  if (existing) {
    return interaction.reply({
      content: `You already have an open ticket: <#${existing.channelId}>`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'user';

  const channel = await guild.channels.create({
    name: `ticket-${safeName}`,
    type: ChannelType.GuildText,
    parent: config.categoryId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: config.supportRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: guild.members.me.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
      },
    ],
  });

  const record = await createTicket(guild.id, {
    channelId: channel.id,
    openerId: interaction.user.id,
    openerTag: interaction.user.tag,
  });

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setTitle(`🎫 Ticket #${record.ticketNumber}`)
    .setDescription(
      `Welcome, ${interaction.user}! A member of <@&${config.supportRoleId}> will be with you shortly.\n\n` +
      `Please describe your issue in as much detail as you can — this helps us help you faster.`
    )
    .setFooter({ text: `Opened by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp();

  await channel.send({
    content: `${interaction.user} • <@&${config.supportRoleId}>`,
    embeds: [embed],
    components: [ticketControlsRow(false)],
  });

  await interaction.editReply(`🎫 Your ticket has been created: ${channel}`);
}

async function claimTicketAction(interaction) {
  const guild = interaction.guild;
  const ticket = await getTicketByChannel(guild.id, interaction.channel.id);

  if (!ticket) {
    return interaction.reply({ content: 'This doesn\'t look like an active ticket channel.', ephemeral: true });
  }
  if (ticket.status !== 'open') {
    return interaction.reply({ content: 'This ticket is already closed.', ephemeral: true });
  }

  await claimTicket(guild.id, interaction.channel.id, interaction.user.tag);

  const embed = EmbedBuilder.from(interaction.message.embeds[0]).addFields({
    name: 'Claimed by',
    value: interaction.user.tag,
  });

  await interaction.update({ embeds: [embed], components: [ticketControlsRow(true)] });
  await interaction.channel.send(`✅ ${interaction.user} has claimed this ticket.`);
}

async function closeTicketAction(interaction) {
  const guild = interaction.guild;
  const ticket = await getTicketByChannel(guild.id, interaction.channel.id);

  if (!ticket) {
    return interaction.reply({ content: 'This doesn\'t look like an active ticket channel.', ephemeral: true });
  }

  await interaction.reply('🔒 Closing this ticket and generating a transcript...');

  const config = await getTicketConfig(guild.id);
  const closedRecord = await closeTicket(guild.id, interaction.channel.id);

  const transcriptFile = await buildTranscript(interaction.channel, {
    ticketNumber: ticket.ticketNumber,
    openerTag: ticket.openerTag,
    guild,
  });

  if (config.transcriptChannelId) {
    const logChannel = await guild.channels.fetch(config.transcriptChannelId).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
        .setTitle(`🎫 Ticket #${ticket.ticketNumber} Closed`)
        .addFields(
          { name: 'Opened by', value: ticket.openerTag, inline: true },
          { name: 'Closed by', value: interaction.user.tag, inline: true },
          { name: 'Claimed by', value: ticket.claimedByTag ?? 'Not claimed', inline: true }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed], files: [transcriptFile] }).catch(() => {});
    }
  }

  // Give people a moment to read the closing message before the channel disappears.
  setTimeout(() => {
    interaction.channel.delete().catch(() => {});
  }, 5000);
}

module.exports = { openTicket, claimTicketAction, closeTicketAction, ticketControlsRow };
