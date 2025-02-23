import { EmbedBuilder } from 'discord.js'

/**
 * Get a builder for a draft embed. Includes some themeing and footer
 * @returns A builder for a draft embed
 */
export default function getEmbedBuilder() {
    return new EmbedBuilder()
        .setColor('#E1AA2D')
        .setFooter({ text: 'Brought to you by Draft Bot™', iconURL: 'https://cdn.discordapp.com/app-icons/1342958919814877194/f3338f874c220c3a5e2d0fd0e986d073.png?size=256' })
}
