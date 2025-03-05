import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js'
import { getTournaments, getTournament, getParticipants, recordMatch } from '../challongeApi'
import logger from '../logger'
import invariant from 'tiny-invariant'
import getEmbedBuilder from '../embedBuilder'

export const data = new SlashCommandBuilder()
    .setName('record')
    .setDescription('Record a match')
    .addStringOption((option) => option.setName('tournament').setDescription('The name of the draft').setAutocomplete(true).setRequired(true))
    .addStringOption((option) => option.setName('player-one').setDescription('Player one name').setAutocomplete(true).setRequired(true))
    .addStringOption((option) => option.setName('player-two').setDescription('Player two name').setAutocomplete(true).setRequired(true))
    .addNumberOption((option) => option.setName('wins').setDescription('Number of wins').setRequired(true))
    .addNumberOption((option) => option.setName('losses').setDescription('Number of losses').setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    const tournamentId = +interaction.options.getString('tournament', true)
    const playerOneId = interaction.options.getString('player-one', true)
    const playerTwoId = interaction.options.getString('player-two', true)
    const wins = interaction.options.getNumber('wins', true)
    const losses = interaction.options.getNumber('losses', true)

    const tournament = await getTournament(tournamentId, true, true)

    const playerOneParticipant = tournament.participants?.find(({ participant }) => participant.id.toString() === playerOneId)
    invariant(playerOneParticipant, `Player ${playerOneId} not found in tournament ${tournament.name}`)

    const playerTwoParticipant = tournament.participants?.find(({ participant }) => participant.id.toString() === playerTwoId)
    invariant(playerTwoParticipant, `Player ${playerTwoId} not found in tournament ${tournament.name}`)

    const match = tournament.matches?.find(
        ({ match }) =>
            (match.player1_id === playerOneParticipant.participant.id && match.player2_id === playerTwoParticipant.participant.id) ||
            (match.player1_id === playerTwoParticipant.participant.id && match.player2_id === playerOneParticipant.participant.id)
    )

    if (!match) {
        throw new Error(`No match found between ${playerOneParticipant.participant.name} and ${playerTwoParticipant.participant.name} in tournament ${tournamentId}`)
    }

    await recordMatch(tournament.id, match.match.id, playerOneParticipant.participant.id, playerTwoParticipant.participant.id, wins, losses)

    let result = 'tied'
    if (wins > losses) {
        result = 'won'
    } else if (wins < losses) {
        result = 'lost'
    }

    const exampleEmbed = getEmbedBuilder()
        .setTitle(`Player ${playerOneParticipant.participant.name} ${result} (${wins} - ${losses}) against ${playerTwoParticipant.participant.name}`)
        .setURL(tournament.full_challonge_url)

    await interaction.reply({ embeds: [exampleEmbed] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)
    const lValue = focusedOption.value.toLowerCase()

    if (focusedOption.name === 'tournament') {
        const tournaments = await getTournaments('in_progress')
        const filtered = tournaments.filter((tournament) => tournament.name.toLowerCase().startsWith(lValue))
        await interaction.respond(filtered.map((tournament) => ({ name: tournament.name, value: tournament.id.toString() })))
        return
    }

    if (focusedOption.name === 'player-one' || focusedOption.name === 'player-two') {
        const tournamentId = +interaction.options.getString('tournament', true)
        const participants = await getParticipants(tournamentId)
        let filtered = participants
        if (focusedOption.name === 'player-one') {
            const playerTwoId = interaction.options.getString('player-two', false)
            if (playerTwoId) {
                filtered = filtered.filter((participant) => participant.id.toString() !== playerTwoId)
            }
        } else if (focusedOption.name === 'player-two') {
            const playerOneId = interaction.options.getString('player-one', false)
            if (playerOneId) {
                filtered = filtered.filter((participant) => participant.id.toString() !== playerOneId)
            }
        }

        await interaction.respond(filtered.map((participant) => ({ name: participant.display_name, value: participant.id.toString() })))
        return
    }

    logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`)
    return []
}
