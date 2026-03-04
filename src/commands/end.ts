import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js'
import { listTournaments, endTournament, getTournament } from '../challongeApi'
import logger from '../logger'
import getEmbedBuilder from '../embedBuilder'
import calculateStandings from '../standingCalculator'
import { hostLiveImage } from '../liveImageHostService'

export const data = new SlashCommandBuilder()
    .setName('end')
    .setDescription('Finalize the draft')
    .addStringOption((option) => option.setName('draft').setDescription('The name of the draft').setAutocomplete(true).setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    const tournamentId = interaction.options.getString('draft', true)

    const [tournament] = await Promise.all([getTournament(tournamentId), endTournament(tournamentId)])
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
            return `🏆 ${name} (${wins}-${losses}-${ties})`
        })
        .join('\n')

    const liveImageUrl = await hostLiveImage(tournament.data.attributes.live_image_url)

    const embed = getEmbedBuilder()
        .setTitle(`${tournament.data.attributes.name} ended!`)
        .addFields({ name: 'Standings', value: winners })
        .setURL(tournament.data.attributes.full_challonge_url)
        .setImage(liveImageUrl)

    if (participated.length > 0) {
        embed.addFields({ name: 'Received a participation trophy', value: participated })
    }

    await interaction.reply({ embeds: [embed] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)
    if (focusedOption.name !== 'draft') {
        logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`)
        return []
    }

    const tournaments = await listTournaments('in_progress')
    const filtered = tournaments.data.filter((tournament) => tournament.attributes.name.toLowerCase().startsWith(focusedOption.value.toLowerCase()))
    await interaction.respond(
        filtered.map((tournament) => ({
            name: tournament.attributes.name,
            value: tournament.id,
        }))
    )
}
