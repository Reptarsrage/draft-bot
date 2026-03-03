import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js'
import { listTournaments, joinTournament, getTournament, listParticipants } from '../challongeApi'
import logger from '../logger'
import getEmbedBuilder from '../embedBuilder'

export const data = new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join the draft')
    .addStringOption((option) => option.setName('draft').setDescription('The name of the draft').setAutocomplete(true).setRequired(true))
    .addStringOption((option) => option.setName('username').setDescription('Your Challonge username (optional)').setRequired(false))
    .addStringOption((option) => option.setName('email').setDescription('Your Challonge email (optional)').setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction) {
    const tournamentId = interaction.options.getString('draft', true)
    const challongeUsername = interaction.options.getString('username', false)
    const challongeEmail = interaction.options.getString('email', false)
    const participant = await joinTournament(tournamentId, interaction.user.username, challongeUsername, challongeEmail)
    const [tournament, participants] = await Promise.all([getTournament(tournamentId), listParticipants(tournamentId)])
    const profile = findProfile(participant)

    const embed = getEmbedBuilder()
        .setTitle(`${participant.data.attributes.name} joined ${tournament.data.attributes.name}!`)
        .setURL(tournament.data.attributes.full_challonge_url)
        .setDescription(`${participants.data.length} have joined the draft so far`)
        .addFields({ name: 'Participants', value: participants.data.map((participant) => participant.attributes.name).join('\n'), inline: true })

    if (profile) {
        embed.setThumbnail(profile.attributes.image_url)
    }

    await interaction.reply({ embeds: [embed] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)
    if (focusedOption.name !== 'draft') {
        logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`)
        return []
    }

    const tournaments = await listTournaments('pending')
    const filtered = tournaments.data.filter((tournament) => tournament.attributes.name.toLowerCase().startsWith(focusedOption.value.toLowerCase()))
    await interaction.respond(
        filtered.map((tournament) => ({
            name: tournament.attributes.name,
            value: tournament.id,
        }))
    )
}

function findProfile(participant: Awaited<ReturnType<typeof joinTournament>>) {
    return participant.included?.find((included) => included.type === 'user')
}
