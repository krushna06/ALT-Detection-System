const { verificationLinks, verificationTimers } = require('../../data/verificationLinks');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config.json');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === 'generate_verification_link') {
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
      }
    }
  },
};
