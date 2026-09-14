# Discord Slash Bot

A minimal Discord bot with slash commands, built on discord.js v14.

## What's included

- `index.js` — main bot process, loads commands and handles interactions
- `deploy-commands.js` — registers your slash commands with Discord's API (run this after adding/editing a command)
- `commands/ping.js` — example command, replies with latency
- `commands/hello.js` — example command, greets a user (shows how to use options)
- `.env.example` — template for your secrets

## 1. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your bot token, Client ID, and (for testing) your Guild ID —
see the Discord Developer Portal steps if you haven't created a bot yet.

Register your slash commands (only needed after you add/change commands):

```bash
npm run deploy
```

Run the bot locally:

```bash
npm start
```

You should see "Logged in as YourBot#1234" in the console, and `/ping` and
`/hello` should work in your test server.

## 2. Deploying to Railway

1. Push this project to a GitHub repo (Railway deploys from git).
2. In Railway, click **New Project > Deploy from GitHub repo** and select it.
3. Go to your service's **Variables** tab and add:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID` (optional — omit for global commands, or set it for instant updates on one server)
4. Railway auto-detects Node.js and runs `npm install` then `npm start`. No extra config needed.
5. **Important:** `npm start` only runs `index.js` — it does NOT register commands.
   Run `npm run deploy` once (locally, with the same `.env` values, or via
   Railway's one-off command feature) any time you add or change a slash command.
6. Check the **Deployments > Logs** tab in Railway — you should see the
   "Logged in as..." message once it's live.

## Adding new commands

Create a new file in `commands/`, following the pattern in `ping.js` or
`hello.js` (export a `data` SlashCommandBuilder and an `execute` function).
Then run `npm run deploy` again to register it.
