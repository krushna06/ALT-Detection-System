require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const requestIp = require('request-ip');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
  ],
});

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
        used INTEGER DEFAULT 0
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
    const uniqueId = uuidv4();

    db.run('INSERT INTO users (userId, verified, uniqueId) VALUES (?, ?, ?)', [userId, 0, uniqueId], (err) => {
      if (!err) {
        const verificationLink = `http://localhost:${PORT}/verify/${uniqueId}`;
        const embed = new EmbedBuilder()
          .setTitle('Verification Required')
          .setDescription(`Click [here](${verificationLink}) to verify your account.`)
          .setColor('#00FF00');
        interaction.reply({ embeds: [embed], flags: 64 });
      }
    });
  }
});

app.get('/verify/:uniqueId', (req, res) => {
  const uniqueId = req.params.uniqueId;
  db.get('SELECT * FROM users WHERE uniqueId = ?', [uniqueId], (err, user) => {
    if (!user || user.used) return res.status(404).send('Invalid verification link.');
    res.send(`
      <form method="POST" action="/verify/${uniqueId}">
        <label>What is 1 + 1?</label>
        <input type="text" name="answer" required />
        <button type="submit">Submit</button>
      </form>
    `);
  });
});

app.post('/verify/:uniqueId', (req, res) => {
  const uniqueId = req.params.uniqueId;
  const answer = req.body.answer.trim();
  const userIp = req.clientIp;

  if (answer !== '2') {
    console.log(`Failed verification attempt for UUID: ${uniqueId}`);
    return res.status(400).send('Incorrect answer. Please try again.');
  }

  db.get('SELECT * FROM users WHERE uniqueId = ?', [uniqueId], (err, user) => {
    if (err || !user || user.used) return res.status(404).send('Invalid verification link.');

    db.get('SELECT * FROM users WHERE ipAddress = ?', [userIp], (err, existingUser) => {
      if (err) return res.status(500).send('An error occurred. Please try again later.');

      if (existingUser) return res.send(`This IP address is already associated with another account. UserID: ${existingUser.userId}`);

      db.run('UPDATE users SET ipAddress = ?, verified = ?, used = 1 WHERE uniqueId = ?', [userIp, 1, uniqueId], (err) => {
        if (!err) {
          const guild = client.guilds.cache.get(process.env.GUILD_ID);
          const member = guild.members.cache.get(user.userId);
          const verifiedRole = guild.roles.cache.get('1261340851561299998');
          if (member && verifiedRole) member.roles.add(verifiedRole).catch(console.error);
          console.log(`Successful verification for UUID: ${uniqueId}`);
          res.send('Verification successful! You can now access the server.');
        }
      });
    });
  });
});

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));

client.login(process.env.DISCORD_TOKEN);
