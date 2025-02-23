import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js'
import { getTournaments, getTournament } from '../challongeApi'
import logger from '../logger'
import getEmbedBuilder from '../embedBuilder'
import calculateStandings from '../standingCalculator'

export const data = new SlashCommandBuilder()
    .setName('results')
    .setDescription('Finalize the draft')
    .addStringOption((option) => option.setName('draft').setDescription('The name of the draft').setAutocomplete(true).setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    const tournamentId = +interaction.options.getString('draft', true)

    const tournament = await getTournament(tournamentId, true, true)

    const standings = await calculateStandings(tournamentId)

    const awards = ['🥇', '🥈', '🥉']
    const placements = ['1st', '2nd', '3rd']

    const winners = standings
        .filter((standing) => standing.rank <= 2)
        .map(({ name, wins, losses, ties, rank }) => {
            const award = awards[Math.min(rank, awards.length - 1)]
            const placement = placements[Math.min(rank, placements.length - 1)]
            return `${award} ${placement}: ${name} (${wins}-${losses}-${ties})`
        })
        .join('\n')

    const participated = standings
        .filter((standing) => standing.rank > 2)
        .map(({ name, wins, losses, ties }) => {
            return `${name} (${wins}-${losses}-${ties})`
        })
        .join('\n')

    const exampleEmbed = getEmbedBuilder()
        .setTitle(`${tournament.name} ended!`)
        .addFields({ name: 'Standings', value: winners }, { name: 'Received a participation trophy 🏆', value: participated })
        .setURL(tournament.full_challonge_url)
        .setImage(tournament.live_image_url)
        .setThumbnail('https://assets.challonge.com/_next/static/media/logo-symbol-only.8b0dbfc7.svg')

    await interaction.reply({ embeds: [exampleEmbed] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)
    if (focusedOption.name !== 'draft') {
        logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`)
        return []
    }

    const tournaments = await getTournaments('ended')
    const filtered = tournaments.filter((tournament) => tournament.name.startsWith(focusedOption.value))
    await interaction.respond(
        filtered.map((tournament) => ({
            name: tournament.name,
            value: tournament.id.toString(),
        }))
    )
}
