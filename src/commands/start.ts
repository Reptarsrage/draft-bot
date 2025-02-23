import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js'
import { getTournaments, startTournament, getTournament } from '../challongeApi'
import logger from '../logger'
import getEmbedBuilder from '../embedBuilder'

export const data = new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start the draft')
    .addStringOption((option) => option.setName('draft').setDescription('The name of the draft').setAutocomplete(true).setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    const tournamentId = +interaction.options.getString('draft', true)

    const tournament = await getTournament(tournamentId)
    await startTournament(tournament.id)

    const draftUrl = `https://draftmancer.com/?session=${tournament.id}`

    const exampleEmbed = getEmbedBuilder()
        .setTitle(`${tournament.name} started!`)
        .setDescription(`Generated draft URL: ${draftUrl}`)
        .setURL(tournament.full_challonge_url)
        .setImage(tournament.live_image_url)

    await interaction.reply({ embeds: [exampleEmbed] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)
    if (focusedOption.name !== 'draft') {
        logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`)
        return []
    }

    const tournaments = await getTournaments('pending')
    const filtered = tournaments.filter((tournament) => tournament.name.startsWith(focusedOption.value))
    await interaction.respond(
        filtered.map((tournament) => ({
            name: tournament.name,
            value: tournament.id.toString(),
        }))
    )
}
