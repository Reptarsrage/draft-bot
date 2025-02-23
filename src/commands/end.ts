import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder, type AutocompleteInteraction } from 'discord.js'
import { getTournaments, endTournament, getTournament } from '../challongeApi'
import logger from '../logger'

export const data = new SlashCommandBuilder()
    .setName('end')
    .setDescription('Finalize the draft')
    .addStringOption((option) => option.setName('draft').setDescription('The name of the draft').setAutocomplete(true).setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('draft', true)

    const tournament = await getTournament(name, true, true)
    await endTournament(tournament.id.toString())

    // TODO: Print standings

    const exampleEmbed = new EmbedBuilder().setTitle(`Tournament ${tournament.name} ended`).setURL('https://challonge.com/1zqui9oz/module')

    await interaction.reply({ embeds: [exampleEmbed] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)
    if (focusedOption.name !== 'draft') {
        logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`)
        return []
    }

    const tournaments = await getTournaments('in_progress')
    const filtered = tournaments.filter((tournament) => tournament.name.startsWith(focusedOption.value))
    await interaction.respond(
        filtered.map((tournament) => ({
            name: tournament.name,
            value: tournament.id.toString(),
        }))
    )
}
