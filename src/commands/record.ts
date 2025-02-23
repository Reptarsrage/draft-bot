import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder, type AutocompleteInteraction } from 'discord.js'
import { getTournaments, getTournament, getParticipants, recordMatch } from '../challongeApi'
import logger from '../logger'
import invariant from 'tiny-invariant'

export const data = new SlashCommandBuilder()
    .setName('record')
    .setDescription('Record a match')
    .addStringOption((option) => option.setName('tournament').setDescription('The name of the draft').setAutocomplete(true).setRequired(true))
    .addStringOption((option) => option.setName('player').setDescription('The name of your opponent').setAutocomplete(true).setRequired(true))
    .addNumberOption((option) => option.setName('wins').setDescription('Number of wins').setRequired(true))
    .addNumberOption((option) => option.setName('losses').setDescription('Number of losses').setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    const tournamentId = interaction.options.getString('tournament', true)
    const playerOneName = interaction.user.username
    const playerTwoId = interaction.options.getString('player', true)
    const wins = interaction.options.getNumber('wins', true)
    const losses = interaction.options.getNumber('losses', true)

    const tournament = await getTournament(tournamentId, true, true)

    const playerOneParticipant = tournament.participants?.find(({ participant }) => participant.name === playerOneName)
    invariant(playerOneParticipant, `Player ${playerOneName} not found in tournament ${tournamentId}`)

    const playerTwoParticipant = tournament.participants?.find(({ participant }) => participant.id.toString() === playerTwoId)
    invariant(playerTwoParticipant, `Player ${playerTwoId} not found in tournament ${tournamentId}`)

    const match = tournament.matches?.find(
        ({ match }) =>
            (match.player1_id === playerOneParticipant.participant.id && match.player2_id === playerTwoParticipant.participant.id) ||
            (match.player1_id === playerTwoParticipant.participant.id && match.player2_id === playerOneParticipant.participant.id)
    )

    if (!match) {
        throw new Error(`No match found between ${playerOneName} and ${playerTwoParticipant.participant.name} in tournament ${tournamentId}`)
    }

    await recordMatch(tournament.id, match.match.id, playerOneParticipant.participant.id, playerTwoParticipant.participant.id, wins, losses)

    let result = 'tied'
    if (wins > losses) {
        result = 'won'
    } else if (wins < losses) {
        result = 'lost'
    }

    const exampleEmbed = new EmbedBuilder()
        .setTitle(`Player ${playerOneName} ${result} (${wins} - ${losses}) against ${playerTwoParticipant.participant.name}`)
        .setURL(tournament.full_challonge_url)

    await interaction.reply({ embeds: [exampleEmbed] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)
    if (focusedOption.name === 'tournament') {
        const tournaments = await getTournaments('in_progress')
        const filtered = tournaments.filter((tournament) => tournament.name.startsWith(focusedOption.value))
        await interaction.respond(filtered.map((tournament) => ({ name: tournament.name, value: tournament.id.toString() })))
        return
    }

    if (focusedOption.name === 'player') {
        const tournamentId = interaction.options.getString('tournament', true)
        const participants = await getParticipants(tournamentId)
        const filtered = participants.filter((participant) => participant.name.startsWith(focusedOption.value) && participant.name !== interaction.user.username)
        await interaction.respond(filtered.map((participant) => ({ name: participant.name, value: participant.id.toString() })))
        return
    }

    logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`)
    return []
}
