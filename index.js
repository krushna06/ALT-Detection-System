const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config/config.json');
const startServer = require('./server');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).flatMap(dir => {
  const eventPath = path.join(eventsPath, dir);
  return fs.readdirSync(eventPath).map(file => path.join(eventPath, file));
}).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(file);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(token);

// Start the server when the bot is ready
client.once('ready', () => {
  startServer(client);
});
