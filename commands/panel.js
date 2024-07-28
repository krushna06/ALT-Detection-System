const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const { verificationLinks } = require('../data/verificationLinks');
const config = require('../config/config.json');

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

    interaction.client.on('interactionCreate', async (buttonInteraction) => {
      if (!buttonInteraction.isButton() || buttonInteraction.customId !== 'generate_verification_link') return;

      const userId = buttonInteraction.user.id;
      const verificationId = uuidv4();
      const verificationLink = `${config.baseUrl}/verify/${verificationId}`;

      verificationLinks.set(verificationId, userId);

      console.log(`Verification link generated for user ${userId}: ${verificationLink}`);
      await buttonInteraction.reply(`Click the following link to verify: ${verificationLink}`);
    });
  },
};
