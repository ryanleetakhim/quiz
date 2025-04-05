// Game settings
export const GAME_CONSTANTS = {
    // Player limits
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 8,
    DEFAULT_MAX_PLAYERS: 4,

    // Questions
    QUESTIONS_PER_GAME: 30,

    // Timer settings
    MIN_ANSWER_TIME: 15, // seconds
    MAX_ANSWER_TIME: 60, // seconds
    ANSWER_TIME_LIMIT: 15, // seconds
    TIMER_UPDATE_INTERVAL: 50, // ms
    TIMER_WIDTH_PERCENT_PER_SECOND: 5, // 5% per second
    TIMER_DANGER_THRESHOLD: 5, // seconds - when appeal timer turns red

    // UI constants
    PERCENTAGE_BASE: 100, // For percentage calculations
    TRANSITION_SPEED: "0.1s", // Faster transition between states
    PODIUM_SIZE: 3, // Number of players shown on podium
    PODIUM_OFFSET: 4, // Ranking offset after podium

    // Timings (milliseconds)
    TYPEWRITER_SPEED: 100,
    NEXT_QUESTION_DELAY: 5000,
    APPEAL_RESOLUTION_DELAY: 1000,
    APPEAL_VOTING_TIME: 20000, // 20 seconds for voting
    APPEAL_RESULT_DISPLAY_TIME: 5000, // 5 seconds to show appeal result

    // Add this constant for the delay before host starts the game
    HOST_START_GAME_DELAY: 3000, // milliseconds

    // Color thresholds for timer
    TIMER_RED_THRESHOLD: 5, // seconds
    TIMER_YELLOW_THRESHOLD: 10, // seconds

    // Colors
    TIMER_COLOR: {
        GOOD: "#4CAF50", // green
        WARNING: "#FFC107", // yellow
        DANGER: "#F44336", // red
        APPEAL: "#9C27B0", // purple
    },
};
