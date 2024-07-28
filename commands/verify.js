const { SlashCommandBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const { verificationLinks, verificationTimers } = require('../data/verificationLinks');
const config = require('../config/config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Generate a verification link.'),
  async execute(interaction) {
    const userId = interaction.user.id;

    if (verificationTimers.has(userId)) {
      const timeRemaining = verificationTimers.get(userId) - Date.now();
      if (timeRemaining > 0) {
        return interaction.reply({
          content: `You already generated a link, please wait for ${Math.ceil(timeRemaining / 1000)} seconds to generate a new link.`,
          ephemeral: true,
        });
      }
    }

    const verificationId = uuidv4();
    const verificationLink = `${config.baseUrl}/verify/${verificationId}`;

    verificationLinks.set(verificationId, userId);
    const expirationTime = Date.now() + 300000; // 5 minutes
    verificationTimers.set(userId, expirationTime);

    setTimeout(() => {
      verificationLinks.delete(verificationId);
      verificationTimers.delete(userId);
      console.log(`Verification link for user ${userId} has expired.`);
    }, 300000); // 300000 ms = 5 minutes

    console.log(`Verification link generated for user ${userId}: ${verificationLink}`);
    await interaction.reply({ content: `Click the following link to verify: ${verificationLink}`, ephemeral: true });
  },
};
