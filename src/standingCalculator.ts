import invariant from 'tiny-invariant'
import { getTournament } from './challongeApi'
import logger from './logger'

export type Standing = {
    id: number
    name: string
    wins: number
    losses: number
    ties: number
    gameWins: number
    gameTies: number
    rank: number
}

// TIE BREAKS:
// 1. match wins vs tied
// 2. game wins
// 3. points scored
function compareStandings(a: Standing, b: Standing, whoBeatWho: Record<number, number[]>, ptsForMatchWin: number, ptsForMatchTie: number, ptsForGameWin: number) {
    // 0. Match wins
    if (a.wins > b.wins) return -1
    if (a.wins < b.wins) return 1

    // 1. Who beat who
    const didABeatB = whoBeatWho[a.id]?.includes(b.id) ?? false
    const didBBeatA = whoBeatWho[b.id]?.includes(a.id) ?? false
    if (didABeatB && !didBBeatA) return -1
    if (didBBeatA && !didABeatB) return 1

    // 2. Game wins
    if (a.gameWins > b.gameWins) return -1
    if (a.gameWins < b.gameWins) return 1

    // 3. Points scored
    const a_points = a.wins * ptsForMatchWin + a.ties * ptsForMatchTie + a.gameWins * ptsForGameWin
    const b_points = b.wins * ptsForMatchWin + b.ties * ptsForMatchTie + b.gameWins * ptsForGameWin
    if (a_points > b_points) return -1
    if (a_points < b_points) return 1

    logger.warn(`Tie between ${a.name} and ${b.name}`)
    return 0
}

export default async function calculateStandings(tournamentId: number) {
    const tournament = await getTournament(tournamentId, true, true, true)
    const { participants = [], matches = [], pts_for_match_win, pts_for_match_tie, pts_for_game_win } = tournament
    const ptsForMatchWin = parseFloat(pts_for_match_win)
    const ptsForMatchTie = parseFloat(pts_for_match_tie)
    const ptsForGameWin = parseFloat(pts_for_game_win)

    // Create standings
    const standings: Standing[] = []
    for (const participant of participants) {
        standings.push({
            id: participant.participant.id,
            name: participant.participant.display_name,
            wins: 0,
            losses: 0,
            ties: 0,
            gameWins: 0,
            gameTies: 0,
            rank: 0,
        })
    }

    // Count wins
    const whoBeatWho: Record<number, number[]> = {}
    for (const match of matches) {
        const player1 = standings.find((standing) => standing.id === match.match.player1_id)
        const player2 = standings.find((standing) => standing.id === match.match.player2_id)

        invariant(player1, `Player 1 not found for match ${match.match.id}`)
        invariant(player2, `Player 2 not found for match ${match.match.id}`)

        if (match.match.winner_id === player1.id) {
            player1.wins += 1
            whoBeatWho[player1.id] = [...(whoBeatWho[player1.id] ?? []), player2.id]
        } else if (match.match.winner_id === player2.id) {
            player2.wins += 1
            whoBeatWho[player2.id] = [...(whoBeatWho[player2.id] ?? []), player1.id]
        } else {
            player1.ties += 1
            player2.ties += 1
        }

        const [score1, score2] = match.match.scores_csv.split('-').map(Number)
        player1.gameWins += score1
        player2.gameWins += score2
    }

    const winners = standings.sort((a, b) => compareStandings(a, b, whoBeatWho, ptsForMatchWin, ptsForMatchTie, ptsForGameWin))

    // assign ranks
    let currentRank = 0
    for (let i = 0; i < winners.length; i++) {
        const current = winners[i]
        current.rank = currentRank

        if (i < winners.length - 1) {
            const next = winners[i + 1]
            const isTiedWithNext = compareStandings(current, next, whoBeatWho, ptsForMatchWin, ptsForMatchTie, ptsForGameWin) === 0
            if (!isTiedWithNext) {
                currentRank += 1
            }
        }
    }

    return winners
}
