import { expect, it, describe, mock, beforeEach, afterEach } from 'bun:test'

import getEmbedBuilder from '../../embedBuilder'
import * as challongeApi from '../../challongeApi'
import calculateStandings, { type Standing } from '../../standingCalculator'
import mockLogger from '../../__mocks__/logger'
import type { ChatInputCommandInteraction } from 'discord.js'
import { execute } from '../end'

beforeEach(() => {
    // Set up common mocks
    mock.module('../../logger', () => ({ default: mockLogger }))
    mock.module('../../standingCalculator', () => ({ default: mock() }))
    mock.module('../../embedBuilder', () => ({ default: mock() }))
    mock.module('../../challongeApi', () => ({
        listTournaments: mock(),
        endTournament: mock(),
        getTournament: mock(),
    }))
})

afterEach(() => {
    // Clean up all mocks
    mock.restore()
    mock.clearAllMocks()
})

describe('execute', () => {
    const standings: Standing[] = [
        {
            id: '1',
            name: 'Player One',
            wins: 1,
            losses: 0,
            ties: 0,
            gameWins: 2,
            gameLosses: 0,
            points: 3,
            rank: 0,
        },
        {
            id: '2',
            name: 'Player Two',
            wins: 0,
            losses: 1,
            ties: 0,
            gameWins: 1,
            gameLosses: 0,
            points: 1,
            rank: 1,
        },
        {
            id: '3',
            name: 'Player Three',
            wins: 0,
            losses: 0,
            ties: 0,
            gameWins: 0,
            gameLosses: 0,
            points: 0,
            rank: 2,
        },
        {
            id: '4',
            name: 'Player Four',
            wins: 0,
            losses: 0,
            ties: 0,
            gameWins: 0,
            gameLosses: 0,
            points: 0,
            rank: 3,
        },
    ]

    it('should end a tournament and give reply', async () => {
        // arrange
        const mockInteraction = {
            reply: mock(),
            options: {
                getString: mock(() => '12345'),
            },
        }

        const mockEmbedBuilder = {
            setTitle: mock(() => mockEmbedBuilder),
            addFields: mock(() => mockEmbedBuilder),
            setURL: mock(() => mockEmbedBuilder),
            setImage: mock(() => mockEmbedBuilder),
            setThumbnail: mock(() => mockEmbedBuilder),
            setDescription: mock(() => mockEmbedBuilder),
        }

        challongeApi.getTournament.mockResolvedValue({ data: { id: '12345', attributes: { name: 'test' } } })
        challongeApi.endTournament.mockResolvedValue({})
        challongeApi.listTournaments.mockResolvedValue([])
        getEmbedBuilder.mockReturnValue(mockEmbedBuilder)
        calculateStandings.mockResolvedValue(standings)

        // act
        await execute(mockInteraction as unknown as ChatInputCommandInteraction)

        // assert
        expect(challongeApi.getTournament).toHaveBeenCalledWith('12345')
        expect(challongeApi.endTournament).toHaveBeenCalledWith('12345')
        expect(getEmbedBuilder).toHaveBeenCalledWith()
        expect(calculateStandings).toHaveBeenCalledWith('12345')
        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith({
            name: 'Standings',
            value: '🥇 1st: Player One (1-0-0)\n🥈 2nd: Player Two (0-1-0)\n🥉 3rd: Player Three (0-0-0)',
        })
        expect(mockEmbedBuilder.addFields).toHaveBeenCalledWith({ name: 'Received a participation trophy', value: '🏆 Player Four (0-0-0)' })
    })
})
