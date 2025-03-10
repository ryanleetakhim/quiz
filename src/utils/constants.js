// Game settings
export const GAME_CONSTANTS = {
    // Player limits
    DEFAULT_MAX_PLAYERS: 6,
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 8,

    // Questions
    QUESTIONS_PER_GAME: 10,

    // Timer settings
    ANSWER_TIME_LIMIT: 15, // seconds
    TIMER_UPDATE_INTERVAL: 50, // More frequent updates (was likely 1000ms)
    TIMER_WIDTH_PERCENT_PER_SECOND: 5, // 5% per second
    TIMER_DANGER_THRESHOLD: 3, // seconds - when appeal timer turns red

    // UI constants
    PERCENTAGE_BASE: 100, // For percentage calculations
    TRANSITION_SPEED: "0.05s", // Faster transition between states
    PODIUM_SIZE: 3, // Number of players shown on podium
    PODIUM_OFFSET: 4, // Ranking offset after podium

    // Mock data
    MOCK_PASSWORD: "1234", // Mock password for demo

    // Timings (milliseconds)
    TYPEWRITER_SPEED: 80,
    NEXT_QUESTION_DELAY: 5000,
    APPEAL_RESOLUTION_DELAY: 2000,
    APPEAL_VOTING_TIME: 10000, // 10 seconds for voting
    APPEAL_RESULT_DISPLAY_TIME: 4000, // 4 seconds to show appeal result

    // Add this constant for the delay before host starts the game
    HOST_START_GAME_DELAY: 3000, // milliseconds

    // Color thresholds for timer
    TIMER_RED_THRESHOLD: 3, // seconds
    TIMER_YELLOW_THRESHOLD: 7, // seconds

    // Colors
    TIMER_COLOR: {
        GOOD: "#4caf50", // green
        WARNING: "#ff9800", // yellow
        DANGER: "#f44336", // red
        APPEAL: "#9c27b0", // purple
    },

    // Bot behavior
    BOT: {
        MIN_RESPONSE_TIME: 1000,
        MAX_RESPONSE_TIME: 5000,
        MIN_CORRECTNESS_RATE: 0.4, // 40%
        MAX_CORRECTNESS_RATE: 0.8, // 80%
        THINKING_TIME_MIN: 2000,
        THINKING_TIME_MAX: 7000,
        ANSWER_PROBABILITY: 0.5,
        APPEAL_ACCEPT_PROBABILITY: 0.6,
        VOTING_DELAY_MIN: 1000,
        VOTING_DELAY_MAX: 5000,
        JOIN_DELAY: 1000,
        READY_DELAY_MIN: 2000,
        READY_DELAY_MAX: 5000,
        MIN_BOTS: 2,
        MAX_BOTS: 4,
        READY_PROBABILITY: 0.7,
    },

    // Difficulty levels
    DIFFICULTY_LEVELS: {
        EASY: "簡單",
        MEDIUM: "中等",
        HARD: "困難",
    },
};
