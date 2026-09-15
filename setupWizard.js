const {
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { setLogChannel, setPromotionLogChannel, setTicketConfig } = require('./configStore');

const BRAND_COLOR = 0x2dd4bf;

// In-memory wizard progress. If the bot restarts mid-wizard, the admin just
// runs /setup again — no real harm done, so this doesn't need a database.
const wizardState = new Map(); // key: `${guildId}:${userId}` -> { step, answers }

const STEPS = [
  {
    key: 'logChannelId',
    title: 'Moderation Log Channel',
    description: 'Where should kicks, bans, warns, and case logs be posted?',
    buildComponent: () =>
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_select')
        .setPlaceholder('Select a text channel...')
        .addChannelTypes(ChannelType.GuildText),
  },
  {
    key: 'promotionChannelId',
    title: 'Staff Announcements Channel',
    description: 'Where should promotions and demotions be announced?',
    buildComponent: () =>
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_select')
        .setPlaceholder('Select a text channel...')
        .addChannelTypes(ChannelType.GuildText),
  },
  {
    key: 'ticketCategoryId',
    title: 'Ticket Category',
    description: 'Which category should new ticket channels be created under?',
    buildComponent: () =>
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_select')
        .setPlaceholder('Select a category...')
        .addChannelTypes(ChannelType.GuildCategory),
  },
  {
    key: 'supportRoleId',
    title: 'Support Role',
    description: 'Which role should be able to see and respond to tickets?',
    buildComponent: () =>
      new RoleSelectMenuBuilder().setCustomId('setup_select').setPlaceholder('Select a role...'),
  },
  {
    key: 'transcriptChannelId',
    title: 'Ticket Transcript Channel',
    description: 'Where should closed-ticket transcripts be posted?',
    buildComponent: () =>
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_select')
        .setPlaceholder('Select a text channel...')
        .addChannelTypes(ChannelType.GuildText),
  },
];

function stateKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function buildStepPayload(stepIndex) {
  const step = STEPS[stepIndex];
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`⚙️ Setup — Step ${stepIndex + 1} of ${STEPS.length}`)
    .setDescription(`**${step.title}**\n${step.description}`)
    .setFooter({ text: 'This setup only you can see. Pick an option below to continue.' });

  const row = new ActionRowBuilder().addComponents(step.buildComponent());
  return { embeds: [embed], components: [row] };
}

async function startSetup(interaction) {
  const key = stateKey(interaction.guild.id, interaction.user.id);
  wizardState.set(key, { step: 0, answers: {} });

  await interaction.reply({ ...buildStepPayload(0), ephemeral: true });
}

async function handleSetupSelection(interaction) {
  const key = stateKey(interaction.guild.id, interaction.user.id);
  const state = wizardState.get(key);

  if (!state) {
    return interaction.update({
      content: 'This setup session expired. Run `/setup` again to restart it.',
      embeds: [],
      components: [],
    });
  }

  const currentStep = STEPS[state.step];
  const selectedId = interaction.values[0];
  state.answers[currentStep.key] = selectedId;

  const nextStepIndex = state.step + 1;

  if (nextStepIndex < STEPS.length) {
    state.step = nextStepIndex;
    wizardState.set(key, state);
    return interaction.update(buildStepPayload(nextStepIndex));
  }

  // All steps answered — save everything.
  wizardState.delete(key);

  await setLogChannel(interaction.guild.id, state.answers.logChannelId);
  await setPromotionLogChannel(interaction.guild.id, state.answers.promotionChannelId);
  await setTicketConfig(interaction.guild.id, {
    categoryId: state.answers.ticketCategoryId,
    supportRoleId: state.answers.supportRoleId,
    transcriptChannelId: state.answers.transcriptChannelId,
  });

  const summary = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('✅ Setup Complete!')
    .setDescription(
      `Here's what I've configured:\n\n` +
      `**Mod log:** <#${state.answers.logChannelId}>\n` +
      `**Staff announcements:** <#${state.answers.promotionChannelId}>\n` +
      `**Ticket category:** <#${state.answers.ticketCategoryId}>\n` +
      `**Support role:** <@&${state.answers.supportRoleId}>\n` +
      `**Ticket transcripts:** <#${state.answers.transcriptChannelId}>\n\n` +
      `One last step: run \`/ticketpanel\` in whatever channel members should use to open tickets. ` +
      `You can re-run \`/setup\` anytime to change any of this.`
    );

  await interaction.update({ embeds: [summary], components: [] });
}

module.exports = { startSetup, handleSetupSelection };
