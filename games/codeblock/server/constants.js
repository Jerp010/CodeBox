// @ts-check

// Game rules
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const ROUND_COUNT = 3;
const QUESTIONS_PER_ROUND = 5;
const TOTAL_QUESTIONS = ROUND_COUNT * QUESTIONS_PER_ROUND;
const OPTIONS_PER_QUESTION = 4;

// Timing (seconds; milliseconds are derived)
const QUESTION_TIME_SECONDS = 20;
const QUESTION_TIME_MS = QUESTION_TIME_SECONDS * 1000;
const ROUND_INTRO_SECONDS = 5;
const ROUND_INTRO_MS = ROUND_INTRO_SECONDS * 1000;

// Difficulty values
const DIFFICULTY = {
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard",
};

// Host-selectable difficulty presets.
// Each array maps round index -> difficulty and must have ROUND_COUNT entries.
const DIFFICULTY_PRESETS = {
    casual: [DIFFICULTY.EASY, DIFFICULTY.EASY, DIFFICULTY.MEDIUM],
    normal: [DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD],
    expert: [DIFFICULTY.MEDIUM, DIFFICULTY.HARD, DIFFICULTY.HARD],
};

const DEFAULT_DIFFICULTY_PRESET = "normal";

// Round twists (fixed order for now)
const TWISTS = {
    STANDARD: "standard",
    DOUBLE: "double",
    STEAL: "steal",
};

const TWIST_BY_ROUND = [
    TWISTS.STANDARD,
    TWISTS.DOUBLE,
    TWISTS.STEAL,
];

// Game phases
const PHASES = {
    LOBBY: "lobby",
    ROUND_INTRO: "round_intro",
    QUESTION_ACTIVE: "question_active",
    QUESTION_REVEAL: "question_reveal",
    ROUND_SUMMARY: "round_summary",
    GAME_OVER: "game_over",
};

// Scoring
// points = BASE_POINTS + MAX_SPEED_BONUS * (1 - timeTakenSeconds / QUESTION_TIME_SECONDS)
// Clamp timeTakenSeconds to [0, QUESTION_TIME_SECONDS] in scoring.js.
const BASE_POINTS = 100;
const MAX_SPEED_BONUS = 500;
const SCORE_FLOOR = 0;

// Twist values
const DOUBLE_POINTS_MULTIPLIER = 2;
const STEAL_PENALTY = 100; // each faster correct player requests this amount from the leader
const MAX_STEAL_PER_QUESTION = 300; // total a leader can lose to steals in one question

module.exports = {
    MIN_PLAYERS,
    MAX_PLAYERS,
    ROUND_COUNT,
    QUESTIONS_PER_ROUND,
    TOTAL_QUESTIONS,
    OPTIONS_PER_QUESTION,
    QUESTION_TIME_SECONDS,
    QUESTION_TIME_MS,
    ROUND_INTRO_SECONDS,
    ROUND_INTRO_MS,
    DIFFICULTY,
    DIFFICULTY_PRESETS,
    DEFAULT_DIFFICULTY_PRESET,
    TWISTS,
    TWIST_BY_ROUND,
    PHASES,
    BASE_POINTS,
    MAX_SPEED_BONUS,
    SCORE_FLOOR,
    DOUBLE_POINTS_MULTIPLIER,
    STEAL_PENALTY,
    MAX_STEAL_PER_QUESTION,
};
