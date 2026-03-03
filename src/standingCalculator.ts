import invariant from 'tiny-invariant'
import { listMatches, listParticipants } from './challongeApi'
import logger from './logger'

export type Standing = {
    id: string
    name: string
    wins: number
    losses: number
    ties: number
    gameWins: number
    gameLosses: number
    points: number
    rank: number
}

/**
 * Compare standings between player a and player b.
 *
 * The order of comparison is:
 * 1. Total Points
 * 2. Match wins against tied opponents
 * 3. Game-Win Percentage
 *
 * NOTE: Their can be a circular chain of who beat who, this is currently not handled by us or challonge.
 *
 * @param a - The first player
 * @param b - The second player
 * @param whoBeatWho - A map of who beat who
 * @returns -1 if a is better than b, 1 if b is better than a, 0 if they are tied
 */
function compareStandings(a: Standing, b: Standing, whoBeatWho: Record<string, string[]>) {
    // 1. Total Points
    if (a.points > b.points) return -1
    if (a.points < b.points) return 1

    // 2. Who beat who
    const didABeatB = whoBeatWho[a.id]?.includes(b.id) ?? false
    const didBBeatA = whoBeatWho[b.id]?.includes(a.id) ?? false
    if (didABeatB && !didBBeatA) return -1
    if (didBBeatA && !didABeatB) return 1

    // 3. Points scored
    const aGameWinPercentage = a.gameWins / (a.gameWins + a.gameLosses)
    const bGameWinPercentage = b.gameWins / (b.gameWins + b.gameLosses)
    if (aGameWinPercentage > bGameWinPercentage) return -1
    if (aGameWinPercentage < bGameWinPercentage) return 1

    logger.warn(`Un-resolvable tie between ${a.name} and ${b.name}`)
    return 0
}

/**
 * Calulate overall standings
 *
 * We assume a lot of things:
 * - Tournament is round-robin
 * - All matches are complete
 * - All matches have 2 participants, each player played every other player once
 * - All matches consist of one score of wins/losses
 * - The tournament win con is "match wins"
 * - Tie breakers include: Match wins against tied opponents, points scored
 * - The tournament round robin options are:
 *   - Iterations: 1
 *   - Ranking: "match wins"
 *   - Pts for game win: 0
 *   - Pts for game tie: 0
 *   - Pts for match win: 3
 *   - Pts for match tie: 1
 */
export default async function calculateStandings(tournamentId: string) {
    const [participants, matches] = await Promise.all([listParticipants(tournamentId), listMatches(tournamentId)])

    // Create standings
    const standings: Standing[] = []
    for (const participant of participants.data) {
        standings.push({
            id: participant.id,
            name: participant.attributes.name,
            wins: 0,
            losses: 0,
            ties: 0,
            gameWins: 0,
            gameLosses: 0,
            points: 0,
            rank: 0,
        })
    }

    // Count wins
    const whoBeatWho: Record<string, string[]> = {}
    for (const match of matches.data) {
        invariant(match.attributes.state === 'complete', `Match ${match.id} is not complete`)
        invariant(match.attributes.points_by_participant.length === 2, `Match ${match.id} has ${match.attributes.points_by_participant.length} participants, expected 2`)

        const [participantScore1, participantScore2] = match.attributes.points_by_participant
        const player1Standing = standings.find((standing) => standing.id === participantScore1.participant_id.toString())
        const player2Standing = standings.find((standing) => standing.id === participantScore2.participant_id.toString())

        invariant(player1Standing, `Player 1 not found for match ${match.id}`)
        invariant(player2Standing, `Player 2 not found for match ${match.id}`)

        if (match.attributes.tie) {
            player1Standing.ties += 1
            player2Standing.ties += 1
        } else if (match.attributes.winner_id.toString() === player1Standing.id) {
            player1Standing.wins += 1
            player2Standing.losses += 1
            whoBeatWho[player1Standing.id] = [...(whoBeatWho[player1Standing.id] ?? []), player2Standing.id]
        } else if (match.attributes.winner_id.toString() === player2Standing.id) {
            player2Standing.wins += 1
            player1Standing.losses += 1
            whoBeatWho[player2Standing.id] = [...(whoBeatWho[player2Standing.id] ?? []), player1Standing.id]
        } else {
            throw new Error(`Match ${match.id} has no winner, but also not a tie?`)
        }

        player1Standing.gameWins += participantScore1.scores[0]
        player2Standing.gameWins += participantScore2.scores[0]
        player1Standing.gameLosses += participantScore1.scores[1]
        player2Standing.gameLosses += participantScore2.scores[1]
    }

    // Calculate points
    // Match wins are worth 3 points, ties are worth 1 point
    for (const standing of standings) {
        standing.points = standing.wins * 3 + standing.ties * 1
    }

    const winners = standings.sort((a, b) => compareStandings(a, b, whoBeatWho))

    // assign ranks
    let rank = 0
    for (let i = 0; i < winners.length; i++) {
        let isTie = false
        if (i < winners.length - 1) {
            isTie = compareStandings(winners[i], winners[i + 1], whoBeatWho) === 0
        }

        winners[i].rank = rank
        if (!isTie) {
            rank++
        }
    }

    return winners
}
