import axios from 'axios';
import config from './config';
import logger from './logger';

export interface CreateTournamentResponse {
    tournament: Tournament
}

export interface Tournament {
    accept_attachments: boolean
    allow_participant_match_reporting: boolean
    anonymous_voting: boolean
    category: any
    check_in_duration: any
    completed_at: any
    created_at: string
    created_by_api: boolean
    credit_capped: boolean
    description: string
    game_id: number
    group_stages_enabled: boolean
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
    predictions_opened_at: any
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
    signup_cap: any
    start_at: any
    started_at: any
    started_checking_in_at: any
    state: string
    swiss_rounds: number
    teams: boolean
    tie_breaks: string[]
    tournament_type: string
    updated_at: string
    url: string
    description_source: string
    subdomain: any
    full_challonge_url: string
    live_image_url: string
    sign_up_url: any
    review_before_finalizing: boolean
    accepting_predictions: boolean
    participants_locked: boolean
    game_name: string
    participants_swappable: boolean
    team_convertable: boolean
    group_stages_were_started: boolean
}


/**
 * Create a new tournament
 * @param name - The name of the tournament
 * @see https://api.challonge.com/v1/documents/tournaments/create
 */
export async function createTournament(name: string) {
    logger.info(`Creating tournament ${name}...`);

    const url = new URL('https://api.challonge.com/v1/tournaments.json');
    url.searchParams.set('api_key', config.CHALLONGE_API_KEY);
    url.searchParams.set('tournament[name]', name);
    url.searchParams.set('tournament[tournament_type]', 'round robin');
    url.searchParams.set('tournament[description]', 'Created by the Draft Bot 🤖');
    url.searchParams.set('tournament[open_signup]', 'true');

    try {
        const response = await axios.post<CreateTournamentResponse>(url.toString());

        if (response.status !== 200) {
            logger.error(`Failed to create tournament ${name}: ${response.statusText}`);
            throw new Error(`Failed to create tournament ${name}`);
        }

        const data = response.data;
        logger.info(`Tournament ${name} created: ${data.tournament.id}`);

        return data.tournament;
    } catch (error) {
        handleError(error);
        throw new Error(`Failed to create tournament ${name}`);
    }
}

/**
 * Helper to parse/log axios errors
 * @param error - The error to handle
 */
function handleError(error: unknown) {
    if (!axios.isAxiosError(error)) {
        logger.error(error);
        return;
    }

    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.error(error.response.data);
        logger.error(error.response.status);
        logger.error(error.response.headers);
    } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.error(error.request);
    } else {
        // Something happened in setting up the request that triggered an Error
        logger.error('Error', error.message);
    }

    logger.error(error.config);
}
