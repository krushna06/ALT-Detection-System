const express = require('express');
const axios = require('axios');
const requestIp = require('request-ip');
const { guildId, apiKey, roleId, logChannelId, port } = require('./config/config.json');
const { verificationLinks } = require('./data/verificationLinks');

const startServer = (client) => {
  const app = express();
  app.use(requestIp.mw());

  let firstRequestIgnored = false;

  app.get('/verify/:id', async (req, res) => {
    if (!firstRequestIgnored) {
      firstRequestIgnored = true;
      console.log('First request ignored');
      return res.status(200).send('First request ignored, please try again.');
    }

    const verificationId = req.params.id;
    const userId = verificationLinks.get(verificationId);

    if (!userId) {
      return res.status(404).send('Invalid verification link.');
    }

    try {
      const clientIp = req.clientIp;
      console.log('Client IP:', clientIp);

      const response = await axios.get(`https://vpnapi.io/api/${clientIp}?key=${apiKey}`);

      console.log('API Response:', response.data);

      const guild = client.guilds.cache.get(guildId);
      const logChannel = guild.channels.cache.get(logChannelId);
      const member = await guild.members.fetch(userId);
      const username = member.user.tag;

      const apiResponseMessage = `User: ${username}\n\`\`\`json\n${JSON.stringify(response.data, null, 2)}\n\`\`\``;

      if (!response.data.security) {
        console.error('Security data is undefined:', response.data);
        await logChannel.send(apiResponseMessage);
        return res.status(500).send('Failed to verify your IP.');
      }

      const { vpn, proxy, tor, relay } = response.data.security;

      if (vpn || proxy || tor || relay) {
        try {
          await member.kick('VPN/Proxy/Tor/Relay detected.');
          await logChannel.send(apiResponseMessage);
          res.send('You have been kicked from the server due to VPN/Proxy/Tor/Relay usage.');
        } catch (err) {
          console.error('Failed to kick member:', err);
          await logChannel.send(apiResponseMessage);
          res.status(500).send('Failed to kick member due to insufficient permissions.');
        }
      } else {
        try {
          await member.roles.add(roleId);
          await logChannel.send(apiResponseMessage);
          res.send('You have been verified and given the role.');
        } catch (err) {
          console.error('Failed to add role:', err);
          await logChannel.send(apiResponseMessage);
          res.status(500).send('Failed to add role due to insufficient permissions.');
        }
      }

      verificationLinks.delete(verificationId);
    } catch (error) {
      console.error('Error verifying IP:', error);
      const logChannel = client.channels.cache.get(logChannelId);
      await logChannel.send(`Error verifying IP for user ID ${userId}: \`\`\`${error.message}\`\`\``);
      res.status(500).send('Internal Server Error.');
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

module.exports = startServer;
