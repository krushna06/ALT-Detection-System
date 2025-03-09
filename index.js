require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder, REST, Routes, WebhookClient } = require('discord.js');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const requestIp = require('request-ip');
const axios = require('axios');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
  ],
});

const webhookClient = new WebhookClient({ url: process.env.WEBHOOK_URL });

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(requestIp.mw());

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (!err) {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT UNIQUE,
        ipAddress TEXT,
        verified INTEGER DEFAULT 0,
        uniqueId TEXT UNIQUE,
        used INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

const commands = [{
  name: 'verify',
  description: 'Verify your account to gain access to the server.',
}];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
  } catch (error) {}
})();

client.on('ready', () => console.log(`Logged in as ${client.user.tag}`));

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === 'verify') {
    const userId = interaction.user.id;

    db.get('SELECT * FROM users WHERE userId = ? AND verified = 1', [userId], (err, user) => {
      if (err) return interaction.reply({ content: 'An error occurred. Please try again later.', ephemeral: true });

      if (user) {
        return interaction.reply({ content: 'You\'re already verified.', ephemeral: true });
      }

      const uniqueId = uuidv4();
      const createdAt = Math.floor(Date.now() / 1000);
      const expiresAt = createdAt + 300;

      db.run('INSERT INTO users (userId, verified, uniqueId, createdAt) VALUES (?, ?, ?, datetime("now"))', [userId, 0, uniqueId], (err) => {
        if (!err) {
          const verificationLink = `http://localhost:${PORT}/verify/${uniqueId}`;
          const embed = new EmbedBuilder()
            .setTitle('Verification Required')
            .setDescription(`Click [here](${verificationLink}) to verify your account.\n\nThis link expires <t:${expiresAt}:R>.`)
            .setColor('#00FF00');
          interaction.reply({ embeds: [embed], flags: 64 });
        }
      });
    });
  }
});

app.get('/verify/:uniqueId', (req, res) => {
  const uniqueId = req.params.uniqueId;
  db.get('SELECT * FROM users WHERE uniqueId = ?', [uniqueId], (err, user) => {
    if (!user || user.used) return res.status(404).send('Invalid verification link.');

    const createdAt = new Date(user.createdAt);
    const now = new Date();
    const timeDifference = (now - createdAt) / (1000 * 60);

    if (timeDifference > 5) {
      db.run('DELETE FROM users WHERE uniqueId = ?', [uniqueId], (err) => {
        if (err) console.error('Error deleting expired link:', err);
      });
      return res.status(404).send('This verification link has expired. Please run `/verify` again to generate a new link.');
    }

    res.send(`
      <form method="POST" action="/verify/${uniqueId}">
        <label>What is 1 + 1?</label>
        <input type="text" name="answer" required />
        <button type="submit">Submit</button>
      </form>
    `);
  });
});

app.post('/verify/:uniqueId', async (req, res) => {
  const uniqueId = req.params.uniqueId;
  const answer = req.body.answer.trim();
  const userIp = req.clientIp;

  if (answer !== '2') {
    webhookClient.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Verification Failed')
          .setDescription(`User <@${user.userId}> failed the captcha.`)
          .setColor('#FF0000')
      ]
    });
    return res.status(400).send('Incorrect answer. Please try again.');
  }

  db.get('SELECT * FROM users WHERE uniqueId = ?', [uniqueId], async (err, user) => {
    if (err || !user || user.used) return res.status(404).send('Invalid verification link.');

    const createdAt = new Date(user.createdAt);
    const now = new Date();
    const timeDifference = (now - createdAt) / (1000 * 60);

    if (timeDifference > 5) {
      db.run('DELETE FROM users WHERE uniqueId = ?', [uniqueId], (err) => {
        if (err) console.error('Error deleting expired link:', err);
      });
      return res.status(404).send('This verification link has expired. Please run `/verify` again to generate a new link.');
    }

    try {
      const vpnCheckResponse = await axios.get(`https://vpnapi.io/api/${userIp}?key=${process.env.VPN_API_KEY}`);
      const { vpn, proxy, tor, relay } = vpnCheckResponse.data.security;
      const securityDetails = `VPN: ${vpn}\nProxy: ${proxy}\nTOR: ${tor}\nRelay: ${relay}`;

      if (vpn || proxy || tor || relay) {
        webhookClient.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Suspicious IP Detected')
              .setDescription(`User <@${user.userId}> detected with suspicious IP:\n${securityDetails}`)
              .setColor('#FFA500')
          ]
        });
        return res.send('Verification failed. VPN/Proxy detected.');
      }
    } catch (error) {
      console.error('Error checking VPN API:', error);
      return res.status(500).send('Error verifying IP address. Please try again later.');
    }

    db.get('SELECT * FROM users WHERE ipAddress = ?', [userIp], (err, existingUser) => {
      if (err) return res.status(500).send('An error occurred. Please try again later.');

      if (existingUser) {
        webhookClient.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Verification Failed')
              .setDescription(`User <@${user.userId}> was detected as an alt. Existing account(s): <@${existingUser.userId}>`)
              .setColor('#FF0000')
          ]
        });
        return res.send(`This IP address is already associated with another account. UserID: ${existingUser.userId}`);
      }

      db.run('UPDATE users SET ipAddress = ?, verified = ?, used = 1 WHERE uniqueId = ?', [userIp, 1, uniqueId], (err) => {
        if (!err) {
          const guild = client.guilds.cache.get(process.env.GUILD_ID);
          const member = guild.members.cache.get(user.userId);
          const verifiedRole = guild.roles.cache.get('1261340851561299998');
          if (member && verifiedRole) member.roles.add(verifiedRole).catch(console.error);

          webhookClient.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('Verification Successful')
                .setDescription(`User <@${user.userId}> has been verified.`)
                .setColor('#00FF00')
            ]
          });
          res.send('Verification successful! You can now access the server.');
        }
      });
    });
  });
});

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));

client.login(process.env.DISCORD_TOKEN);