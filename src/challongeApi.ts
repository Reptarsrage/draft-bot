import axios from 'axios'
import config from './config'
import logger from './logger'
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 30 })
const baseURL = 'https://api.challonge.com/'

export interface TournamentResponse {
    tournament: Tournament
}

export interface ParticipantResponse {
    participant: Participant
}

export interface MatchResponse {
    match: Match
}

export interface Tournament {
    accept_attachments: boolean
    allow_participant_match_reporting: boolean
    anonymous_voting: boolean
    created_at: string
    created_by_api: boolean
    credit_capped: boolean
    description: string
    game_id: number
    group_stages_enabled: boolean
    sign_up_url: string
    hide_forum: boolean
    hide_seeds: boolean
    hold_third_place_match: boolean
    id: number
    max_predictions_per_user: number
    name: string
    notify_users_when_matches_open: boolean
    notify_users_when_the_tournament_ends: boolean
    open_signup: boolean
    participants_count: number
    prediction_method: number
    private: boolean
    progress_meter: number
    pts_for_bye: string
    pts_for_game_tie: string
    pts_for_game_win: string
    pts_for_match_tie: string
    pts_for_match_win: string
    quick_advance: boolean
    ranked_by: string
    require_score_agreement: boolean
    rr_pts_for_game_tie: string
    rr_pts_for_game_win: string
    rr_pts_for_match_tie: string
    rr_pts_for_match_win: string
    sequential_pairings: boolean
    show_rounds: boolean
    state: string
    swiss_rounds: number
    teams: boolean
    tie_breaks: string[]
    tournament_type: string
    updated_at: string
    url: string
    description_source: string
    full_challonge_url: string
    live_image_url: string
    review_before_finalizing: boolean
    accepting_predictions: boolean
    participants_locked: boolean
    game_name: string
    participants_swappable: boolean
    team_convertable: boolean
    group_stages_were_started: boolean
    matches?: MatchResponse[]
    participants?: ParticipantResponse[]
}

export interface Participant {
    active: boolean
    created_at: string
    icon: string
    id: number
    invitation_id: number
    invite_email: string
    name: string
    on_waiting_list: boolean
    seed: number
    tournament_id: number
    updated_at: string
    challonge_username: string
    challonge_email_address_verified: boolean
    removable: boolean
    participatable_or_invitation_attached: boolean
    confirm_remove: boolean
    invitation_pending: boolean
    display_name_with_invitation_email_address: string
    email_hash: string
    username: string
    attached_participatable_portrait_url: string
    can_check_in: boolean
    checked_in: boolean
    reactivatable: boolean
}

export interface Match {
    attachment_count: number
    created_at: string
    group_id: number
    has_attachment: boolean
    id: number
    identifier: string
    location: string
    loser_id: number
    player1_id: number
    player1_is_prereq_match_loser: boolean
    player1_prereq_match_id: number
    player1_votes: number
    player2_id: number
    player2_is_prereq_match_loser: boolean
    player2_prereq_match_id: number
    player2_votes: number
    round: number
    scheduled_time: string
    started_at: string
    state: string
    tournament_id: number
    underway_at: string
    updated_at: string
    winner_id: number
    prerequisite_match_ids_csv: string
    scores_csv: string
}

/**
 * Create a new tournament
 * @param name - The name of the tournament
 * @see https://api.challonge.com/v1/documents/tournaments/create
 */
export async function createTournament(name: string) {
    logger.info(`Creating tournament ${name}...`)

    const url = new URL('/v1/tournaments.json', baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)
    url.searchParams.set('tournament[name]', name)
    url.searchParams.set('tournament[tournament_type]', 'round robin')
    url.searchParams.set('tournament[description]', 'Created by the Draft Bot 🤖')
    url.searchParams.set('tournament[open_signup]', 'true')
    url.searchParams.set('tournament[game_id]', '289') // Magic: The Gathering

    try {
        const response = await axios.post<TournamentResponse>(url.toString())

        if (response.status !== 200) {
            logger.error(`Failed to create tournament ${name}: ${response.statusText}`)
            throw new Error(`Failed to create tournament ${name}`)
        }

        const data = response.data
        logger.info(`Tournament ${name} created: ${data.tournament.id}`)

        return data.tournament
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
export async function startTournament(tournamentId: number) {
    const url = new URL(`/v1/tournaments/${tournamentId}/start.json`, baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)

    try {
        logger.info(`Starting tournament ${tournamentId}...`)
        await axios.post<TournamentResponse>(url.toString())
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
export async function endTournament(tournamentId: number) {
    const url = new URL(`/v1/tournaments/${tournamentId}/finalize.json`, baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)

    try {
        logger.info(`Ending tournament ${tournamentId}...`)
        await axios.post<TournamentResponse>(url.toString())
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to end tournament ${tournamentId}`)
    }
}

export async function getParticipant(tournamentId: number, participantId: number) {
    if (cache.has(`participant_${tournamentId}_${participantId}`)) {
        return cache.get<Participant>(`participant_${tournamentId}_${participantId}`)!
    }

    const url = new URL(`/v1/tournaments/${tournamentId}/participants/${participantId}.json`, baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)

    try {
        logger.info(`Getting participant ${participantId} in tournament ${tournamentId}...`)
        const response = await axios.get<ParticipantResponse>(url.toString())
        logger.info(`Got participant ${participantId} in tournament ${tournamentId}`)
        cache.set(`participant_${tournamentId}_${participantId}`, response.data.participant)
        return response.data.participant
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get participant ${participantId} in tournament ${tournamentId}`)
    }
}

export async function getParticipants(tournamentId: number) {
    if (cache.has(`participants_${tournamentId}`)) {
        return cache.get<Participant[]>(`participants_${tournamentId}`)!
    }

    const url = new URL(`/v1/tournaments/${tournamentId}/participants.json`, baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)

    try {
        logger.info(`Getting participants for tournament ${tournamentId}...`)
        const response = await axios.get<ParticipantResponse[]>(url.toString())
        const participants = response.data.map((data) => data.participant)
        logger.info(`Got ${participants.length} participants for tournament ${tournamentId}`)
        cache.set(`participants_${tournamentId}`, participants)
        return participants
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get participants for tournament ${tournamentId}`)
    }
}

export async function getMatch(tournamentId: number, matchId: number) {
    if (cache.has(`match_${tournamentId}_${matchId}`)) {
        return cache.get<Match>(`match_${tournamentId}_${matchId}`)!
    }

    const url = new URL(`/v1/tournaments/${tournamentId}/matches/${matchId}.json`, baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)

    try {
        logger.info(`Getting match ${matchId} in tournament ${tournamentId}...`)
        const response = await axios.get<MatchResponse>(url.toString())
        logger.info(`Got match ${matchId} in tournament ${tournamentId}`)
        cache.set(`match_${tournamentId}_${matchId}`, response.data.match)
        return response.data.match
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get match ${matchId} in tournament ${tournamentId}`)
    }
}

export async function getMatches(tournamentId: number, participantId: number) {
    if (cache.has(`matches_${tournamentId}_${participantId}`)) {
        return cache.get<Match[]>(`matches_${tournamentId}_${participantId}`)!
    }

    const url = new URL(`/v1/tournaments/${tournamentId}/matches.json`, baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)
    url.searchParams.set('participant_id', participantId.toString())

    try {
        logger.info(`Getting matches for tournament ${tournamentId} for participant ${participantId}...`)
        const response = await axios.get<MatchResponse[]>(url.toString())
        const matches = response.data.map((data) => data.match)
        logger.info(`Got ${matches.length} matches for tournament ${tournamentId} for participant ${participantId}`)
        cache.set(`matches_${tournamentId}_${participantId}`, matches)
        return matches
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to get matches for tournament ${tournamentId} for participant ${participantId}`)
    }
}

export async function recordMatch(tournamentId: number, matchId: number, playerOneId: number, playerTwoId: number, playerOneScore: number, playerTwoScore: number) {
    let winnerId = 'tie'
    if (playerOneScore > playerTwoScore) {
        winnerId = playerOneId.toString()
    } else if (playerTwoScore > playerOneScore) {
        winnerId = playerTwoId.toString()
    }

    const url = new URL(`/v1/tournaments/${tournamentId}/matches/${matchId}.json`, baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)
    url.searchParams.set('match[scores_csv]', `${playerOneScore}-${playerTwoScore}`)
    url.searchParams.set('match[winner_id]', winnerId)

    try {
        logger.info(`Recording match ${matchId} in tournament ${tournamentId}...`)
        await axios.put<MatchResponse>(url.toString())
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
export async function getTournament(tournamentId: number, includeParticipants = false, includeMatches = false) {
    const cachedTournament = cache.get<Tournament>(`tournament_${tournamentId}`)
    if (cachedTournament) {
        return cachedTournament
    }

    const url = new URL(`/v1/tournaments/${tournamentId}.json`, baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)
    url.searchParams.set('include_participants', includeParticipants ? '1' : '0')
    url.searchParams.set('include_matches', includeMatches ? '1' : '0')

    logger.info(`Getting tournament ${tournamentId}...`)
    const response = await axios.get<TournamentResponse>(url.toString())
    const tournament = response.data.tournament
    cache.set(`tournament_${tournamentId}`, tournament)
    logger.info(`Tournament ${tournamentId} got: ${tournament.name}`)
    return tournament
}

/**
 * Get all tournaments in a given state
 * @param state - The state of the tournaments to get
 * @see https://api.challonge.com/v1/documents/tournaments/index
 */
export async function getTournaments(state: 'all' | 'pending' | 'in_progress' | 'ended' = 'all') {
    const cachedTournaments = cache.get<Tournament[]>(`tournaments_${state}`)
    if (cachedTournaments) {
        return cachedTournaments
    }

    const url = new URL('/v1/tournaments.json', baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)
    url.searchParams.set('state', state)

    try {
        logger.info(`Getting tournaments in state ${state}...`)
        const response = await axios.get<TournamentResponse[]>(url.toString())
        const tournaments = response.data.map((data) => data.tournament)
        cache.set(`tournaments_${state}`, tournaments)
        logger.info(`Got ${tournaments.length} tournaments in state ${state}`)
        return tournaments
    } catch (error) {
        handleError(error)
        throw new Error('Failed to get tournaments')
    }
}

/**
 * Join a tournament
 * @param tournamentId - The id or url of the tournament to join
 * @param participantName - The name of the participant to join
 * @see https://api.challonge.com/v1/documents/tournaments/join
 */
export async function joinTournament(tournamentId: number, participantName: string) {
    const url = new URL(`/v1/tournaments/${tournamentId}/participants.json`, baseURL)
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY)
    url.searchParams.set('participant[name]', participantName)
    url.searchParams.set('participant[challonge_username]', participantName)

    try {
        logger.info(`Joining tournament ${tournamentId} as ${participantName}...`)
        const response = await axios.post<ParticipantResponse>(url.toString())
        logger.info(`Joined tournament ${tournamentId} as ${participantName}`)
        return response.data.participant
    } catch (error) {
        handleError(error)
        throw new Error(`Failed to join tournament ${tournamentId}`)
    }
}

/**
 * Helper to parse/log axios errors
 * @param error - The error to handle
 */
function handleError(error: unknown) {
    if (!axios.isAxiosError(error)) {
        logger.error(error)
        return
    }

    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.error(error.response.data)
        logger.error(error.response.status)
        logger.error(error.response.headers)
    } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.error(error.request)
    } else {
        // Something happened in setting up the request that triggered an Error
        logger.error('Error', error.message)
    }

    logger.error(error.config)
}
