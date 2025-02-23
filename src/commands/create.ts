import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js'
import { createTournament } from '../challongeApi'
import getEmbedBuilder from '../embedBuilder'

export const data = new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a new draft')
    .addStringOption((option) => option.setName('draft').setDescription('The name of the draft').setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('draft', true)

    const tourney = await createTournament(name)

    const exampleEmbed = getEmbedBuilder()
        .setTitle(`${name} created!`)
        .setURL(tourney.full_challonge_url)
        .setDescription(`Use the \`/join\` command to join the draft or go to ${tourney.sign_up_url}`)
        .setThumbnail('https://assets.challonge.com/_next/static/media/logo-symbol-only.8b0dbfc7.svg')

    await interaction.reply({ embeds: [exampleEmbed] })
}
