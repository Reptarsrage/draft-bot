import NodeCache from 'node-cache'

import config from './config'
import logger from './logger'

const cache = new NodeCache({ stdTTL: 30 })
const baseURL = 'https://api.challonge.com/v2.1/'

export interface ChallongeObject {
    id: string
    type: string
    attributes: unknown
}

export interface Tournament extends ChallongeObject {
    type: 'tournament'
    attributes: {
        url: string
        name: string
        sign_up_url: string
        live_image_url: string
        full_challonge_url: string
        round_robin_options: {
            iterations: number
            ranking: '' | 'match wins' | 'game wins' | 'game win percentage' | 'points scored' | 'points difference' | 'custom'
            pts_for_game_win: number
            pts_for_game_tie: number
            pts_for_match_win: number
            pts_for_match_tie: number
        }
    }
}

export interface Match extends ChallongeObject {
    type: 'match'
    attributes: {
        state: 'pending' | 'open' | 'complete'
        winner_id: number
        tie: boolean
        points_by_participant: {
            participant_id: number
            scores: number[]
        }[]
    }
}

export interface Participant extends ChallongeObject {
    type: 'participant'
    attributes: {
        name: string
        relationships: {
            user?: {
                data: {
                    id: string
                    type: 'user'
                }
            }
        }
    }
}

export interface User extends ChallongeObject {
    type: 'user'
    attributes: {
        username: string
        image_url: string
    }
}

export interface ListResponse<TData extends ChallongeObject, TIncluded extends ChallongeObject = never> {
    data: TData[]
    included?: TIncluded[]
}

export interface DataResponse<TData extends ChallongeObject, TIncluded extends ChallongeObject = never> {
    data: TData
    included?: TIncluded[]
}

interface ErrorResponse {
    errors: {
        status: number
        detail: string
        source?: Record<string, string>
    }[]
}

/**
 * Create a new tournament
 * @param name - The name of the tournament
 * @see https://api.challonge.com/v1/documents/tournaments/create
 */
export async function createTournament(name: string) {
    const url = new URL('tournaments.json', baseURL)
    const body = JSON.stringify({
        data: {
            type: 'tournament',
            attributes: {
                name,
                tournament_type: 'round robin',
                private: true,
                description: 'Created by the Draft Bot 🤖',
                registration_options: {
                    open_signup: true,
                },
                game_name: 'Magic: The Gathering',
                round_robin_options: {
                    iterations: 1,
                    ranking: 'match wins',
                    pts_for_game_win: 0,
                    pts_for_game_tie: 0,
                    pts_for_match_win: 3,
                    pts_for_match_tie: 1,
                },
                notifications: {
                    upon_matches_open: false,
                    upon_tournament_ends: false,
                },
            },
        },
    })

    try {
        logger.info(`Creating tournament ${name}...`)
        const response = await makeApiRequest<DataResponse<Tournament>>(url.toString(), 'POST', body)
        logger.info(`Tournament ${name} created: ${response.data.id}`)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to create tournament ${name}`)
    }
}

/**
 * Start a tournament
 * @param tournamentId - The id of the tournament to start
 * @see https://api.challonge.com/v1/documents/tournaments/start
 */
export async function startTournament(tournamentId: string) {
    const url = new URL(`tournaments/${tournamentId}/change_state.json`, baseURL)
    const body = JSON.stringify({
        data: {
            type: 'TournamentState',
            id: tournamentId,
            attributes: {
                state: 'start',
            },
        },
    })

    try {
        logger.info(`Starting tournament ${tournamentId}...`)
        const response = await makeApiRequest<DataResponse<Tournament>>(url.toString(), 'PUT', body)
        logger.info(`Tournament ${tournamentId} started`)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to start tournament ${tournamentId}`)
    }
}

/**
 * End a tournament
 * @param tournamentId - The id of the tournament to end
 * @see https://api.challonge.com/v1/documents/tournaments/end
 */
export async function endTournament(tournamentId: string) {
    const url = new URL(`tournaments/${tournamentId}/change_state.json`, baseURL)
    const body = JSON.stringify({
        data: {
            type: 'TournamentState',
            id: tournamentId,
            attributes: {
                state: 'finalize',
            },
        },
    })

    try {
        logger.info(`Ending tournament ${tournamentId}...`)
        const response = await makeApiRequest<DataResponse<Tournament>>(url.toString(), 'PUT', body)
        logger.info(`Tournament ${tournamentId} ended`)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to end tournament ${tournamentId}`)
    }
}

export async function getParticipant(tournamentId: string, participantId: number) {
    if (cache.has(`participant_${tournamentId}_${participantId}`)) {
        return cache.get<DataResponse<Participant, User>>(`participant_${tournamentId}_${participantId}`)!
    }

    const url = new URL(`tournaments/${tournamentId}/participants/${participantId}.json`, baseURL)

    try {
        logger.info(`Getting participant ${participantId} in tournament ${tournamentId}...`)
        const response = await makeApiRequest<DataResponse<Participant, User>>(url.toString(), 'GET')
        logger.info(`Got participant ${participantId} in tournament ${tournamentId}`)
        cache.set(`participant_${tournamentId}_${participantId}`, response)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get participant ${participantId} in tournament ${tournamentId}`)
    }
}

export async function listParticipants(tournamentId: string) {
    if (cache.has(`participants_${tournamentId}`)) {
        return cache.get<ListResponse<Participant, User>>(`participants_${tournamentId}`)!
    }

    const url = new URL(`tournaments/${tournamentId}/participants.json`, baseURL)

    try {
        logger.info(`Getting participants for tournament ${tournamentId}...`)
        const response = await makeApiRequest<ListResponse<Participant, User>>(url.toString(), 'GET')
        logger.info(`Got ${response.data.length} participants for tournament ${tournamentId}`)
        cache.set(`participants_${tournamentId}`, response)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get participants for tournament ${tournamentId}`)
    }
}

export async function getMatch(tournamentId: string, matchId: number) {
    if (cache.has(`match_${tournamentId}_${matchId}`)) {
        return cache.get<DataResponse<Match>>(`match_${tournamentId}_${matchId}`)!
    }

    const url = new URL(`tournaments/${tournamentId}/matches/${matchId}.json`, baseURL)

    try {
        logger.info(`Getting match ${matchId} in tournament ${tournamentId}...`)
        const response = await makeApiRequest<DataResponse<Match>>(url.toString(), 'GET')
        logger.info(`Got match ${matchId} in tournament ${tournamentId}`)
        cache.set(`match_${tournamentId}_${matchId}`, response)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get match ${matchId} in tournament ${tournamentId}`)
    }
}

export async function listMatches(tournamentId: string) {
    const url = new URL(`tournaments/${tournamentId}/matches.json`, baseURL)
    try {
        logger.info(`Getting matches for tournament ${tournamentId}...`)
        const response = await makeApiRequest<ListResponse<Match>>(url.toString(), 'GET')
        logger.info(`Got ${response.data.length} matches for tournament ${tournamentId}`)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get matches for tournament ${tournamentId}`)
    }
}

export async function listMatchesForParticipant(tournamentId: string, participantId: string) {
    if (cache.has(`matches_${tournamentId}_${participantId}`)) {
        return cache.get<ListResponse<Match>>(`matches_${tournamentId}_${participantId}`)!
    }

    const url = new URL(`tournaments/${tournamentId}/matches.json`, baseURL)
    url.searchParams.set('participant_id', participantId)

    try {
        logger.info(`Getting matches for tournament ${tournamentId} for participant ${participantId}...`)
        const response = await makeApiRequest<ListResponse<Match>>(url.toString(), 'GET')
        logger.info(`Got ${response.data.length} matches for tournament ${tournamentId} for participant ${participantId}`)
        cache.set(`matches_${tournamentId}_${participantId}`, response)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get matches for tournament ${tournamentId} for participant ${participantId}`)
    }
}

export async function recordMatch(tournamentId: string, matchId: string, playerOneId: string, playerTwoId: string, playerOneScore: number, playerTwoScore: number) {
    const url = new URL(`tournaments/${tournamentId}/matches/${matchId}.json`, baseURL)
    const body = JSON.stringify({
        data: {
            type: 'Match',
            attributes: {
                match: [
                    {
                        participant_id: playerOneId,
                        score_set: playerOneScore.toString(),
                    },
                    {
                        participant_id: playerTwoId,
                        score_set: playerTwoScore.toString(),
                    },
                ],
            },
        },
    })

    try {
        logger.info(`Recording match ${matchId} in tournament ${tournamentId}...`)
        const response = await makeApiRequest<DataResponse<Match>>(url.toString(), 'PUT', body)
        logger.info(`Recorded match ${matchId} in tournament ${tournamentId}`)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to record match ${matchId} in tournament ${tournamentId}`)
    }
}

/**
 * Get a tournament by id or url
 * @param tournamentId - The id or url of the tournament to get
 * @see https://api.challonge.com/v1/documents/tournaments/show
 */
export async function getTournament(tournamentId: string, bypassCache = false) {
    const cachedTournament = cache.get<DataResponse<Tournament>>(`tournament_${tournamentId}`)
    if (cachedTournament && !bypassCache) {
        return cachedTournament
    }

    const url = new URL(`tournaments/${tournamentId}.json`, baseURL)

    try {
        logger.info(`Getting tournament ${tournamentId}...`)
        const response = await makeApiRequest<DataResponse<Tournament>>(url.toString(), 'GET')
        cache.set(`tournament_${tournamentId}`, response)
        logger.info(`Tournament ${tournamentId} got: ${response.data.attributes.name}`)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get tournament ${tournamentId}`)
    }
}

/**
 * Get all tournaments in a given state
 * @param state - The state of the tournaments to get
 * @see https://api.challonge.com/v1/documents/tournaments/index
 */
export async function listTournaments(state: 'all' | 'pending' | 'in_progress' | 'ended' = 'all') {
    const cachedTournaments = cache.get<ListResponse<Tournament>>(`tournaments_${state}`)
    if (cachedTournaments) {
        return cachedTournaments
    }

    const url = new URL('tournaments.json', baseURL)
    url.searchParams.set('state', state)

    try {
        logger.info(`Getting tournaments in state ${state}...`)
        const response = await makeApiRequest<ListResponse<Tournament>>(url.toString(), 'GET')
        cache.set(`tournaments_${state}`, response)
        logger.info(`Got ${response.data.length} tournaments in state ${state}`)
        return response
    } catch (error) {
        handleError(error)
        throw new Error('Failed to get tournaments')
    }
}

/**
 * Join a tournament
 * @param tournamentId - The id or url of the tournament to join
 * @param participantName - The name of the participant to join
 * @param username - The username of the participant to join
 * @see https://api.challonge.com/v1/documents/participants/create
 */
export async function joinTournament(tournamentId: string, participantName: string, challongeUsername: string | null = null, challongeEmail: string | null = null) {
    const url = new URL(`tournaments/${tournamentId}/participants.json`, baseURL)
    const body = JSON.stringify({
        data: {
            type: 'Participants',
            attributes: {
                name: participantName,
                email: challongeEmail ?? '',
                username: challongeUsername ?? '',
            },
        },
    })

    try {
        logger.info(`Joining tournament ${tournamentId} as ${participantName}...`)
        const response = await makeApiRequest<DataResponse<Participant, User>>(url.toString(), 'POST', body)
        logger.info(`Joined tournament ${tournamentId} as ${participantName}`)
        return response
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to join tournament ${tournamentId}`)
    }
}

/**
 * Helper to parse/log errors
 * @param error - The error to handle
 */
function handleError(error: unknown) {
    // TODO: Detect fetch errors and log the response
    logger.error(error)
}

async function makeApiRequest<T>(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body: string | null = null): Promise<T> {
    const myHeaders = new Headers()
    myHeaders.append('Content-Type', 'application/vnd.api+json')
    myHeaders.append('Accept', 'application/json')
    myHeaders.append('Authorization-Type', '')
    myHeaders.append('Authorization', config.CHALLONGE_API_KEY)

    const response = await fetch(url, {
        method,
        headers: myHeaders,
        body,
        redirect: 'follow',
    })

    if (!response.ok) {
        const errorResponse: ErrorResponse = await response.json()
        if (Array.isArray(errorResponse.errors)) {
            logger.error(errorResponse.errors, `Received ${errorResponse.errors.length} errors from Challonge`)
        }

        throw new Error(`Failed to make API request to ${url}: [${response.status}] ${response.statusText}`)
    }

    return (await response.json()) as T
}
