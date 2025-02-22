import { Collection, Client, GatewayIntentBits, MessageFlags } from 'discord.js';
import { commands, type SlashCommand } from './slashCommands';
import config from './config';
import logger from './logger';

/**
 * Start the discord bot
 */
export default async function startBot() {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    // Register all commands
    const registeredCommands = new Collection<string, SlashCommand>();
    for (const command of commands) {
        registeredCommands.set(command.data.name, command);
    }

    client.on('ready', () => {
        logger.info(`Logged in as ${client.user?.tag}!`);
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        const command = registeredCommands.get(interaction.commandName);

        if (!command) {
            logger.warn(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            logger.error(error, 'Error executing command');
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            }
        }
    });

    logger.info('Logging in client to discord...');

    await client.login(config.DISCORD_TOKEN);

    logger.info('Logged in to discord!');
}