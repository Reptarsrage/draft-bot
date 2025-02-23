import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { createTournament } from '../challongeApi'

export const data = new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a new draft')
    .addStringOption((option) => option.setName('draft').setDescription('The name of the draft').setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('draft', true)

    const tourney = await createTournament(name)

    const exampleEmbed = new EmbedBuilder()
        .setTitle('Draft created')
        .setURL(tourney.full_challonge_url)
        .setDescription(`Use the \`/join\` command to join the draft or go to ${tourney.sign_up_url}`)
        .setImage(tourney.live_image_url)

    await interaction.reply({ embeds: [exampleEmbed] })
}
