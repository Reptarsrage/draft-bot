import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder, type AutocompleteInteraction } from 'discord.js';
import { getTournaments, joinTournament, getTournament, type Tournament } from '../challongeApi';
import logger from '../logger';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 30 });

export const data = new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join the draft')
    .addStringOption(option =>  option
        .setName('name')
        .setDescription('The name of the draft')
        .setAutocomplete(true)
        .setRequired(true))


export async function execute(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString('name', true);

    const tournament = await getTournament(name);
    const participant = await joinTournament(tournament.id.toString(), interaction.user.username);

    const exampleEmbed = new EmbedBuilder()
        .setTitle(`User ${participant.challonge_username} joined ${tournament.name}`)
        .setURL(tournament.full_challonge_url)
        .setImage(participant.attached_participatable_portrait_url)

    await interaction.reply({ embeds: [exampleEmbed] });
}

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name !== 'name') {
        logger.warn(`No autocomplete for ${interaction.commandName} ${focusedOption.name}`);
        return [];
    }

    const cachedTournaments = cache.get<Tournament[]>(`tournaments`);
    if (cachedTournaments) {
        const filtered = cachedTournaments.filter(tournament => tournament.name.startsWith(focusedOption.value));
        await interaction.respond(filtered.map(tournament => ({ name: tournament.name, value: tournament.id.toString() })));
        return;
    }


    const tournaments = await getTournaments('pending');
    cache.set(`tournaments`, tournaments);
    const filtered = tournaments.filter(tournament => tournament.name.startsWith(focusedOption.value));
    await interaction.respond(filtered.map(tournament => ({ name: tournament.name, value: tournament.id.toString() })));
}

