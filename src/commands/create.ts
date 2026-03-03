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
        .setURL(tourney.data.attributes.full_challonge_url)
        .setDescription(`Use the \`/join\` command to join the draft or go to ${tourney.data.attributes.sign_up_url}`)

    await interaction.reply({ embeds: [exampleEmbed] })
}
