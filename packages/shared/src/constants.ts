export const SERVER_PORT = 2567

// how often the server sends out positions (per second)
export const TICK_RATE = 20

export const MAX_NAME_LENGTH = 24
export const MAX_CHAT_LENGTH = 200

// the people you can pick from (files in apps/web/public/models/people)
export const AVATAR_IDS = ['male_09', 'female_01', 'male_17', 'female_17', 'male_01', 'female_05']

// voice falloff - full volume inside MIN, silent past MAX (meters)
export const VOICE_MIN_DISTANCE = 2
export const VOICE_MAX_DISTANCE = 15
