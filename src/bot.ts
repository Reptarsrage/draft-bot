import { Collection, Client, GatewayIntentBits, MessageFlags, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js'
import { commands, type SlashCommand } from './slashCommands'
import config from './config'
import logger from './logger'

// Register all commands
const registeredCommands = new Collection<string, SlashCommand>()
for (const command of commands) {
    registeredCommands.set(command.data.name, command)
}

/**
 * Start the discord bot
 */
export default async function startBot() {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] })

    client.on('ready', () => {
        logger.info(`Logged in as ${client.user?.tag}!`)
    })

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isAutocomplete()) {
            return handleAutocomplete(interaction)
        }

        if (interaction.isChatInputCommand()) {
            return handleCommand(interaction)
        }

        logger.warn(`Unknown interaction type: ${interaction.type}`)
    })

    logger.info('Logging in client to discord...')

    await client.login(config.DISCORD_TOKEN)

    logger.info('Logged in to discord!')
}

async function handleCommand(interaction: ChatInputCommandInteraction) {
    const command = registeredCommands.get(interaction.commandName)
    if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`)
        return
    }

    try {
        await command.execute(interaction)
    } catch (error) {
        logger.error(error, 'Error executing command')
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral,
            })
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral,
            })
        }
    }
}

async function handleAutocomplete(interaction: AutocompleteInteraction) {
    const command = registeredCommands.get(interaction.commandName)
    if (!command) {
        logger.warn(`No command matching ${interaction.commandName} was found.`)
        return
    }

    if (!command.autocomplete) {
        logger.warn(`No autocomplete for ${interaction.commandName}`)
        return
    }

    try {
        await command.autocomplete(interaction)
    } catch (error) {
        logger.error(error, 'Error executing autocomplete')
    }
}
