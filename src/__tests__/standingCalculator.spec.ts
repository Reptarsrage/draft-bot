import { expect, it, describe, mock } from 'bun:test'
import mockLogger from '../__mocks__/logger'
import testTournamentOne from './testTournamentOne'
import testTournamentTwo from './testTournamentTwo'

const mockChallongeApi = {
    getTournament: mock(),
}

mock.module('../logger', () => ({ default: mockLogger }))
// mock.module('../challongeApi', () => mockChallongeApi)

describe('calculateStandings', () => {
    it('should calculate the standings of a tournament', async () => {
        // arrange
        const tournamentId = testTournamentOne.id
        const { default: calculateStandings } = await import('../standingCalculator')
        mockChallongeApi.getTournament.mockResolvedValue({ data: testTournamentOne })

        // act
        const standings = await calculateStandings(tournamentId)

        // assert
        expect(standings.length).toBe(testTournamentOne.participants_count)
        expect(standings[0].name).toBe('babybokchoy')
        expect(standings[1].name).toBe('vidavee')
        expect(standings[2].name).toBe('FrozenLama')
        expect(standings[3].name).toBe('Reptarsrage')
        expect(standings[4].name).toBe('pineapplehabanerosalsa')
    })

    it('should rank the standings of a tournament', async () => {
        // arrange
        const tournamentId = testTournamentOne.id
        const { default: calculateStandings } = await import('../standingCalculator')
        mockChallongeApi.getTournament.mockResolvedValue({ data: testTournamentOne })

        // act
        const standings = await calculateStandings(tournamentId)

        // assert
        expect(standings.length).toBe(testTournamentOne.participants_count)
        expect(standings[0].rank).toBe(0)
        expect(standings[1].rank).toBe(1)
        expect(standings[2].rank).toBe(2)
        expect(standings[3].rank).toBe(3)
        expect(standings[4].rank).toBe(4)
    })

    it('should calculate the standings of a tournament', async () => {
        // arrange
        const tournamentId = testTournamentTwo.id
        const { default: calculateStandings } = await import('../standingCalculator')
        mockChallongeApi.getTournament.mockResolvedValue({ data: testTournamentTwo })

        // act
        const standings = await calculateStandings(tournamentId)

        // assert
        expect(standings.length).toBe(testTournamentTwo.participants_count)
        expect(standings[0].name).toBe('reptarsrage')
        expect(standings[1].name).toBe('poop')
    })

    it('should rank the standings of a tournament', async () => {
        // arrange
        const tournamentId = testTournamentTwo.id
        const { default: calculateStandings } = await import('../standingCalculator')
        mockChallongeApi.getTournament.mockResolvedValue({ data: testTournamentTwo })

        // act
        const standings = await calculateStandings(tournamentId)

        // assert
        expect(standings.length).toBe(testTournamentTwo.participants_count)
        expect(standings[0].rank).toBe(0)
        expect(standings[1].rank).toBe(1)
    })
})
