const { verificationLinks } = require('../../data/verificationLinks');
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
        const verificationId = uuidv4();
        const verificationLink = `${config.baseUrl}/verify/${verificationId}`;

        verificationLinks.set(verificationId, userId);

        console.log(`Verification link generated for user ${userId}: ${verificationLink}`);
        await interaction.reply(`Click the following link to verify: ${verificationLink}`);
      }
    }
  },
};
