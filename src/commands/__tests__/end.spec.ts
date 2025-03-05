import { expect, it, describe, mock } from 'bun:test'
import { type ChatInputCommandInteraction } from 'discord.js'
import mockLogger from '../../__mocks__/logger'
import type { Standing } from '../../standingCalculator'

const mockEmbedBuilderModule = {
    default: mock(),
}

const mockChallongeApi = {
    getTournaments: mock(),
    endTournament: mock(),
    getTournament: mock(),
}

const mockStandingCalculator = {
    default: mock(),
}

mock.module('../../logger', () => ({ default: mockLogger }))
mock.module('../../challongeApi', () => mockChallongeApi)
mock.module('../../standingCalculator', () => mockStandingCalculator)
mock.module('../../embedBuilder', () => mockEmbedBuilderModule)

const tournament = {
    id: 12345,
    name: 'test',
}
const mockInteraction = {
    reply: mock(),
    options: {
        getString: mock(),
    },
}

const standings: Standing[] = [
    {
        id: 1,
        name: 'Player One',
        wins: 1,
        losses: 0,
        ties: 0,
        gameWins: 2,
        gameTies: 0,
        rank: 0,
    },
    {
        id: 2,
        name: 'Player Two',
        wins: 0,
        losses: 1,
        ties: 0,
        gameWins: 1,
        gameTies: 0,
        rank: 1,
    },
    {
        id: 3,
        name: 'Player Three',
        wins: 0,
        losses: 0,
        ties: 0,
        gameWins: 0,
        gameTies: 0,
        rank: 2,
    },
    {
        id: 4,
        name: 'Player Four',
        wins: 0,
        losses: 0,
        ties: 0,
        gameWins: 0,
        gameTies: 0,
        rank: 3,
    },
]

describe('execute', () => {
    it('should end a tournament and give reply', async () => {
        // arrange
        const mockEmbedBuilder = {
            setTitle: mock(() => mockEmbedBuilder),
            addFields: mock(() => mockEmbedBuilder),
            setURL: mock(() => mockEmbedBuilder),
            setImage: mock(() => mockEmbedBuilder),
            setThumbnail: mock(() => mockEmbedBuilder),
        }

        const { execute } = await import('../end')
        mockChallongeApi.getTournament.mockResolvedValue(tournament)
        mockStandingCalculator.default.mockResolvedValue(standings)
        mockInteraction.options.getString.mockReturnValue(tournament.id.toString())
        mockEmbedBuilderModule.default.mockReturnValue(mockEmbedBuilder)

        // act
        await execute(mockInteraction as unknown as ChatInputCommandInteraction)

        // assert
        expect(mockChallongeApi.endTournament).toHaveBeenCalledWith(tournament.id)
        expect(mockInteraction.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: [expect.anything()] }))
    })

    it('should reply with standings', async () => {
        // arrange
        const mockEmbedBuilder = {
            setTitle: mock(() => mockEmbedBuilder),
            addFields: mock(() => mockEmbedBuilder),
            setURL: mock(() => mockEmbedBuilder),
            setImage: mock(() => mockEmbedBuilder),
            setThumbnail: mock(() => mockEmbedBuilder),
        }

        const { execute } = await import('../end')
        mockChallongeApi.getTournament.mockResolvedValue(tournament)
        mockStandingCalculator.default.mockResolvedValue(standings)
        mockInteraction.options.getString.mockReturnValue(tournament.id.toString())
        mockEmbedBuilderModule.default.mockReturnValue(mockEmbedBuilder)

        // act
        await execute(mockInteraction as unknown as ChatInputCommandInteraction)

        // assert
        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith({
            name: 'Standings',
            value: '🥇 1st: Player One (1-0-0)\n🥈 2nd: Player Two (0-1-0)\n🥉 3rd: Player Three (0-0-0)',
        })
        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith({ name: 'Received a participation trophy', value: '🏆 Player Four (0-0-0)' })
    })
})
