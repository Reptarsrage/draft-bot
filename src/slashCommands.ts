import { type AutocompleteInteraction, type ChatInputCommandInteraction, REST, Routes, type SlashCommandBuilder, type SlashCommandOptionsOnlyBuilder } from 'discord.js';
import config from './config';
import logger from './logger';

// TODO: Auto glob these imports
import * as pingCommand from './commands/ping';
import * as createCommand from './commands/create';
import * as joinCommand from './commands/join';
import * as startCommand from './commands/start';

export type SlashCommand = {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
};

export const commands: SlashCommand[] = [pingCommand, createCommand, joinCommand, startCommand];

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