# draft-bot

## Installation

[Authorize the bot](https://discord.com/oauth2/authorize?client_id=1342958919814877194)

## Docker

```bash
docker build --pull -t draft-bot:latest .
```

```bash
docker run -d \
  --restart unless-stopped \
  --name draft-bot \
  -e "DISCORD_APP_ID=1342958919814877194" \
  -e "DISCORD_TOKEN=<SECRET>" \
  -e "CHALLONGE_API_KEY=<SECRET>" \
  -e "NODE_ENV=development" \
  -e "DISCORD_PUBLIC_KEY=<SECRET>" \
  draft-bot:latest
```

## Setup

To install dependencies:

```bash
bun install
```

To run:

```bash
bun start
```

This project was created using `bun init` in bun v1.2.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
