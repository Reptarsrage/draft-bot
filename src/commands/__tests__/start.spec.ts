import { expect, it, describe, mock, beforeEach, afterEach } from 'bun:test'

import getEmbedBuilder from '../../embedBuilder'
import * as challongeApi from '../../challongeApi'
import mockLogger from '../../__mocks__/logger'
import type { ChatInputCommandInteraction } from 'discord.js'
import { execute } from '../start'

beforeEach(() => {
    // Set up common mocks
    mock.module('../../embedBuilder', () => ({ default: mock() }))
    mock.module('../../logger', () => ({ default: mockLogger }))
    mock.module('../../challongeApi', () => ({
        listTournaments: mock(),
        startTournament: mock(),
        getTournament: mock(),
    }))
})

afterEach(() => {
    // Clean up all mocks
    mock.restore()
    mock.clearAllMocks()
})

describe('execute', () => {
    it('should start a tournament and give reply', async () => {
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
        challongeApi.startTournament.mockResolvedValue({})
        challongeApi.listTournaments.mockResolvedValue([])
        getEmbedBuilder.mockReturnValue(mockEmbedBuilder)

        // act
        await execute(mockInteraction as unknown as ChatInputCommandInteraction)

        // assert
        expect(challongeApi.getTournament).toHaveBeenCalledWith('12345')
        expect(challongeApi.startTournament).toHaveBeenCalledWith('12345')
        expect(getEmbedBuilder).toHaveBeenCalledWith()
        expect(mockEmbedBuilder.setDescription).toHaveBeenCalledWith('Generated draft URL: https://draftmancer.com/?session=12345')
    })
})
