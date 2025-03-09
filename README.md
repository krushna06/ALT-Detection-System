# Discord Verification Bot

This project is a Discord bot designed to verify users through a secure link-based system with IP detection and captcha verification. The bot uses SQLite for data storage and integrates with a webhook for notifications.

## Features
- **Command-Based Verification**: Users can verify themselves using the `/verify` command.
- **Unique Verification Links**: Generates unique links that expire after 5 minutes.
- **Captcha Security**: Simple captcha to confirm user presence.
- **VPN/Proxy Detection**: Uses the VPN API to detect suspicious IP addresses.
- **Alt Detection**: Identifies duplicate accounts based on IP.
- **Webhook Notifications**: Sends success/failure updates to a webhook for server admins.

## Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [Discord Bot Token](https://discord.com/developers/applications)
- [VPN API Key](https://vpnapi.io/)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/krushna06/ALT-Detection-System
   cd alt-detection-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following:
   ```env
   DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
   CLIENT_ID=YOUR_DISCORD_CLIENT_ID
   GUILD_ID=YOUR_DISCORD_GUILD_ID
   WEBHOOK_URL=YOUR_DISCORD_WEBHOOK_URL
   VPN_API_KEY=YOUR_VPN_API_KEY
   ```

4. Start the bot:
   ```bash
   node index.js
   ```

## Usage
- Use the `/verify` command in your Discord server.
- Click the generated link to access the verification page.
- Complete the captcha to verify successfully.

## Webhook Events
- **Verification Successful:** Notifies admins when a user is successfully verified.
- **Verification Failed:** Alerts when a captcha attempt fails.
- **Suspicious IP Detected:** Notifies admins if a VPN/Proxy/TOR/Relay is detected.
- **Alt Account Detected:** Alerts when multiple accounts are linked to the same IP.

## File Structure
```
.
├── database.sqlite
├── index.js
├── .env
├── package.json
├── LICENSE
└── README.md
```

## TODO
- Refactor Code (Modular)
- Refine UI
- A dashboard (maybe)

## License
This project is licensed under the MIT License.