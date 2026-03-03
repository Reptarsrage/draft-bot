import { expect, it, describe, mock, afterEach, beforeEach } from 'bun:test'
import mockLogger from '../__mocks__/logger'
import type { Match, Participant } from '../challongeApi'

import * as challongeApi from '../challongeApi'

beforeEach(() => {
    mock.module('../logger', () => ({ default: mockLogger }))
    mock.module('../challongeApi', () => ({
        listMatches: mock(),
        listParticipants: mock(),
    }))
})

afterEach(() => {
    mock.restore()
    mock.clearAllMocks()
})

describe('calculateStandings', () => {
    const tournamentId = 'test'
    const testParticipants: Participant[] = [
        {
            id: '1',
            type: 'participant',
            attributes: {
                name: 'one',
                relationships: {},
            },
        },
        {
            id: '2',
            type: 'participant',
            attributes: {
                name: 'two',
                relationships: {},
            },
        },
        {
            id: '3',
            type: 'participant',
            attributes: {
                name: 'three',
                relationships: {},
            },
        },
    ]

    const testMatches: Match[] = [
        {
            id: '1',
            type: 'match',
            attributes: {
                state: 'complete',
                winner_id: 1,
                tie: false,
                points_by_participant: [
                    { participant_id: 1, scores: [1, 0] },
                    { participant_id: 2, scores: [0, 1] },
                ],
            },
        },
        {
            id: '2',
            type: 'match',
            attributes: {
                state: 'complete',
                winner_id: 1,
                tie: false,
                points_by_participant: [
                    { participant_id: 1, scores: [1, 0] },
                    { participant_id: 3, scores: [0, 1] },
                ],
            },
        },
        {
            id: '3',
            type: 'match',
            attributes: {
                state: 'complete',
                winner_id: 2,
                tie: false,
                points_by_participant: [
                    { participant_id: 2, scores: [1, 0] },
                    { participant_id: 3, scores: [0, 1] },
                ],
            },
        },
    ]

    it('should calculate the standings of a tournament', async () => {
        // arrange
        const { default: calculateStandings } = await import('../standingCalculator')
        challongeApi.listParticipants.mockResolvedValue({ data: testParticipants })
        challongeApi.listMatches.mockResolvedValue({ data: testMatches })

        // act
        const standings = await calculateStandings(tournamentId)

        // assert
        expect(standings.length).toBe(3)
        expect(standings[0].name).toBe('one')
        expect(standings[1].name).toBe('two')
        expect(standings[2].name).toBe('three')
    })

    it('should rank the standings of a tournament', async () => {
        // arrange
        const { default: calculateStandings } = await import('../standingCalculator')
        challongeApi.listParticipants.mockResolvedValue({ data: testParticipants })
        challongeApi.listMatches.mockResolvedValue({ data: testMatches })

        // act
        const standings = await calculateStandings(tournamentId)

        // assert
        expect(standings.length).toBe(3)
        expect(standings[0].rank).toBe(0)
        expect(standings[1].rank).toBe(1)
        expect(standings[2].rank).toBe(2)
    })
})
