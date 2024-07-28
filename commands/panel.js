const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Send a verification panel.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Verification')
      .setDescription('Click the button below to generate a verification link.');

    const button = new ButtonBuilder()
      .setCustomId('generate_verification_link')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
