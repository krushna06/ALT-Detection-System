const { SlashCommandBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const { verificationLinks } = require('../data/verificationLinks');
const config = require('../config/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Generate a verification link.'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const verificationId = uuidv4();
    const verificationLink = `${config.baseUrl}/verify/${verificationId}`;

    verificationLinks.set(verificationId, userId);

    console.log(`Verification link generated for user ${userId}: ${verificationLink}`);
    await interaction.reply({ content: `Click the following link to verify: ${verificationLink}`, ephemeral: true });
  },
};
