import { type ChatInputCommandInteraction, REST, Routes, type SlashCommandBuilder } from 'discord.js';
import config from './config';
import logger from './logger';

import * as pingCommand from './commands/ping';

export type SlashCommand = {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export const commands: SlashCommand[] = [pingCommand];

/**
 * Register the slash commands
 */
export default async function registerSlashCommands() {
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

    try {
        logger.info('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(config.DISCORD_APP_ID), { body: commands.map(command => command.data.toJSON()) });

        logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
        logger.error(error, 'Error registering slash commands');
    }
}