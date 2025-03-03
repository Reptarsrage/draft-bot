import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from 'discord.js'
import { getTournaments, joinTournament, getTournament } from '../challongeApi'
import logger from '../logger'
import getEmbedBuilder from '../embedBuilder'

export const data = new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join the draft')
    .addStringOption((option) => option.setName('draft').setDescription('The name of the draft').setAutocomplete(true).setRequired(true))
    .addStringOption((option) => option.setName('username').setDescription('Your Challonge username (optional)').setRequired(false))
    .addStringOption((option) => option.setName('email').setDescription('Your Challonge email (optional)').setRequired(false))

export async function execute(interaction: ChatInputCommandInteraction) {
    const tournamentId = +interaction.options.getString('draft', true)
    const challongeUsername = interaction.options.getString('username', false)
    const challongeEmail = interaction.options.getString('email', false)
    const tournament = await getTournament(tournamentId)
    const participant = await joinTournament(tournament.id, interaction.user.username, challongeUsername, challongeEmail)

    const exampleEmbed = getEmbedBuilder()
        .setTitle(`${participant.challonge_username ?? participant.name} joined ${tournament.name}!`)
        .setURL(tournament.full_challonge_url)
        .setImage(participant.attached_participatable_portrait_url)
        .setThumbnail('https://assets.challonge.com/_next/static/media/logo-symbol-only.8b0dbfc7.svg')

    await interaction.reply({ embeds: [exampleEmbed] })
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true)
    if (focusedOption.name !== 'draft') {
        logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`)
        return []
    }

    const tournaments = await getTournaments('pending')
    const filtered = tournaments.filter((tournament) => tournament.name.toLowerCase().startsWith(focusedOption.value.toLowerCase()))
    await interaction.respond(
        filtered.map((tournament) => ({
            name: tournament.name,
            value: tournament.id.toString(),
        }))
    )
}
