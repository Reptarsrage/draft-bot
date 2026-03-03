import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js'
import { listTournaments, getTournament, listParticipants, recordMatch, listMatches } from '../challongeApi'
import logger from '../logger'
import invariant from 'tiny-invariant'
import getEmbedBuilder from '../embedBuilder'

export const data = new SlashCommandBuilder()
    .setName('record')
    .setDescription('Record a match')
    .addStringOption((option) => option.setName('tournament').setDescription('The name of the draft').setAutocomplete(true).setRequired(true))
    .addStringOption((option) => option.setName('player-one').setDescription('Player one name').setAutocomplete(true).setRequired(true))
    .addStringOption((option) => option.setName('player-two').setDescription('Player two name').setAutocomplete(true).setRequired(true))
    .addNumberOption((option) => option.setName('wins').setDescription('Player one wins').setRequired(true))
    .addNumberOption((option) => option.setName('losses').setDescription('Player one losses').setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    const tournamentId = interaction.options.getString('tournament', true)
    const playerOneId = interaction.options.getString('player-one', true)
    const playerTwoId = interaction.options.getString('player-two', true)
    const wins = interaction.options.getNumber('wins', true)
    const losses = interaction.options.getNumber('losses', true)

    const [tournament, participants, matches] = await Promise.all([getTournament(tournamentId), listParticipants(tournamentId), listMatches(tournamentId)])

    const playerOneParticipant = participants.data.find(({ id }) => id === playerOneId)
    invariant(playerOneParticipant, `Player ${playerOneId} not found in tournament ${tournament.data.attributes.name}`)

    const playerTwoParticipant = participants.data.find(({ id }) => id === playerTwoId)
    invariant(playerTwoParticipant, `Player ${playerTwoId} not found in tournament ${tournament.data.attributes.name}`)

    const match = matches.data.find(
        (match) =>
            (match.attributes.points_by_participant[0].participant_id.toString() === playerOneParticipant.id &&
                match.attributes.points_by_participant[1].participant_id.toString() === playerTwoParticipant.id) ||
            (match.attributes.points_by_participant[0].participant_id.toString() === playerTwoParticipant.id &&
                match.attributes.points_by_participant[1].participant_id.toString() === playerOneParticipant.id)
    )

    if (!match) {
        throw new Error(`No match found between ${playerOneParticipant.attributes.name} and ${playerTwoParticipant.attributes.name} in tournament ${tournamentId}`)
    }

    await recordMatch(tournament.data.id, match.id, playerTwoParticipant.id, playerOneParticipant.id, losses, wins)

    let result = 'tied'
    if (wins > losses) {
        result = 'won'
    } else if (wins < losses) {
        result = 'lost'
    }

    const embed = getEmbedBuilder()
        .setTitle(`Player ${playerOneParticipant.attributes.name} ${result} (${wins} - ${losses}) against ${playerTwoParticipant.attributes.name}`)
        .setURL(tournament.data.attributes.full_challonge_url)

    await interaction.reply({ embeds: [embed] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)
    const lValue = focusedOption.value.toLowerCase()

    if (focusedOption.name === 'tournament') {
        const tournaments = await listTournaments('in_progress')
        const filtered = tournaments.data.filter((tournament) => tournament.attributes.name.toLowerCase().startsWith(lValue))
        await interaction.respond(filtered.map((tournament) => ({ name: tournament.attributes.name, value: tournament.id })))
        return
    }

    if (focusedOption.name === 'player-one' || focusedOption.name === 'player-two') {
        const tournamentId = interaction.options.getString('tournament', true)
        const participants = await listParticipants(tournamentId)
        let filtered = participants.data
        if (focusedOption.name === 'player-one') {
            const playerTwoId = interaction.options.getString('player-two', false)
            if (playerTwoId) {
                filtered = filtered.filter((participant) => participant.id !== playerTwoId)
            }
        } else if (focusedOption.name === 'player-two') {
            const playerOneId = interaction.options.getString('player-one', false)
            if (playerOneId) {
                filtered = filtered.filter((participant) => participant.id !== playerOneId)
            }
        }

        await interaction.respond(filtered.map((participant) => ({ name: participant.attributes.name, value: participant.id })))
        return
    }

    logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`)
    return []
}
