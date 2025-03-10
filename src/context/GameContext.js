import React, { createContext, useContext, useReducer, useEffect } from "react";
import { generateQuestions } from "../data/questionBank";
import { GAME_CONSTANTS } from "../utils/constants";

const GameContext = createContext();

// Initial game state
const initialState = {
    currentScreen: "welcome",
    roomName: "",
    isPrivate: false,
    password: "",
    maxPlayers: GAME_CONSTANTS.DEFAULT_MAX_PLAYERS,
    hostName: "",
    playerName: "",
    selectedTopics: [],
    players: [],
    gameQuestions: [],
    currentQuestionIndex: 0,
    answeringPlayerId: null,
    submittedAnswer: null,
    correctAnswer: null,
    answerResult: null,
    showAnswer: false,
    gameEnded: false,
    appealInProgress: false,
    appealPlayerId: null,
    appealingAnswer: null,
    appealVotes: {},
    appealPassed: null,
    hasBeenAppealed: false, // Add this flag
};

// Bot players behavior simulation
const createBotPlayer = (name, id) => ({
    id,
    name,
    isBot: true,
    isReady: false,
    score: 0,
    responseSpeed:
        Math.random() *
            (GAME_CONSTANTS.BOT.MAX_RESPONSE_TIME -
                GAME_CONSTANTS.BOT.MIN_RESPONSE_TIME) +
        GAME_CONSTANTS.BOT.MIN_RESPONSE_TIME,
    correctnessRate:
        Math.random() *
            (GAME_CONSTANTS.BOT.MAX_CORRECTNESS_RATE -
                GAME_CONSTANTS.BOT.MIN_CORRECTNESS_RATE) +
        GAME_CONSTANTS.BOT.MIN_CORRECTNESS_RATE,
});

// Game state reducer
function gameReducer(state, action) {
    switch (action.type) {
        case "NAVIGATE":
            return { ...state, currentScreen: action.payload };

        case "UPDATE_HOST_SETTINGS":
            return { ...state, ...action.payload };

        case "SET_SELECTED_TOPICS":
            return { ...state, selectedTopics: action.payload };

        case "CREATE_ROOM":
            return {
                ...state,
                currentScreen: "room",
                players: [
                    {
                        id: "host",
                        name: state.hostName,
                        isHost: true,
                        isReady: true,
                        score: 0,
                    },
                ],
            };

        case "ADD_PLAYER":
            if (state.players.length >= state.maxPlayers) return state;
            return {
                ...state,
                players: [...state.players, action.payload],
            };

        case "TOGGLE_PLAYER_READY":
            return {
                ...state,
                players: state.players.map((player) =>
                    player.id === action.payload
                        ? { ...player, isReady: !player.isReady }
                        : player
                ),
            };

        case "START_GAME":
            // Generate questions here to ensure they're available for all players
            const gameQuestions = generateQuestions(
                state.selectedTopics,
                GAME_CONSTANTS.QUESTIONS_PER_GAME
            );
            return {
                ...state,
                currentScreen: "game",
                gameQuestions,
                currentQuestionIndex: 0,
                players: state.players.map((player) => ({
                    ...player,
                    score: 0,
                })),
                answeringPlayerId: null,
                submittedAnswer: null,
                correctAnswer: null,
                answerResult: null,
                showAnswer: false,
                gameEnded: false,
                appealInProgress: false,
                appealPlayerId: null,
                appealingAnswer: null,
                appealVotes: {},
                appealPassed: null,
                hasBeenAppealed: false,
            };

        case "ANSWER_QUESTION":
            return {
                ...state,
                answeringPlayerId: action.payload,
                showAnswer: false,
            };

        case "SUBMIT_ANSWER":
            const currentQuestion =
                state.gameQuestions[state.currentQuestionIndex];
            const isCorrect = action.payload === currentQuestion.answer;

            return {
                ...state,
                submittedAnswer: action.payload,
                correctAnswer: currentQuestion.answer,
                answerResult: isCorrect,
                showAnswer: true,
                players: state.players.map((player) =>
                    player.id === state.answeringPlayerId
                        ? {
                              ...player,
                              score: player.score + (isCorrect ? 1 : 0),
                          }
                        : player
                ),
            };

        case "APPEAL_ANSWER":
            return {
                ...state,
                appealInProgress: true,
                appealPlayerId: state.answeringPlayerId,
                appealingAnswer: state.submittedAnswer,
                appealVotes: {},
                appealPassed: null,
                hasBeenAppealed: true, // Set the flag when an appeal is made
            };

        case "VOTE_ON_APPEAL":
            return {
                ...state,
                appealVotes: {
                    ...state.appealVotes,
                    [action.payload.playerId]: action.payload.vote,
                },
            };

        case "RESOLVE_APPEAL":
            // Count votes
            const votes = Object.values(state.appealVotes);
            const acceptVotes = votes.filter((v) => v === "accept").length;
            const rejectVotes = votes.filter((v) => v === "reject").length;
            // Abstain votes don't count towards either side
            const appealPassed = acceptVotes >= rejectVotes;

            // Update player score if appeal passed
            const updatedPlayers = state.players.map((player) =>
                player.id === state.appealPlayerId && appealPassed
                    ? { ...player, score: player.score + 1 }
                    : player
            );

            return {
                ...state,
                appealInProgress: false,
                appealPassed: appealPassed,
                answerResult: appealPassed ? true : state.answerResult,
                players: updatedPlayers,
            };

        case "NEXT_QUESTION":
            const nextIndex = state.currentQuestionIndex + 1;
            if (nextIndex >= state.gameQuestions.length) {
                return {
                    ...state,
                    currentScreen: "ending",
                    gameEnded: true,
                };
            }

            return {
                ...state,
                currentQuestionIndex: nextIndex,
                answeringPlayerId: null,
                submittedAnswer: null,
                correctAnswer: null,
                answerResult: null,
                showAnswer: false,
                appealInProgress: false,
                appealPlayerId: null,
                appealingAnswer: null,
                appealVotes: {},
                appealPassed: null,
                hasBeenAppealed: false, // Reset the flag for new question
            };

        case "RETURN_TO_ROOM":
            return {
                ...state,
                currentScreen: "room",
                players: state.players.map((player) =>
                    player.isHost ? player : { ...player, isReady: false }
                ),
            };

        // Fix the issue with the joined player by ensuring game questions are generated
        case "CREATE_JOINED_ROOM":
            return {
                ...state,
                currentScreen: "room",
                players: [
                    {
                        id: "host",
                        name: state.hostName,
                        isHost: true,
                        isReady: true, // Host is always ready
                        isBot: true, // Mark host as bot for automation
                        score: 0,
                    },
                ],
            };

        case "SET_GAME_QUESTIONS":
            return {
                ...state,
                gameQuestions: action.payload,
            };

        default:
            return state;
    }
}

export const GameProvider = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    // Simulate bot behavior
    useEffect(() => {
        if (
            state.currentScreen !== "game" ||
            state.showAnswer ||
            state.answeringPlayerId ||
            !state.gameQuestions ||
            state.gameQuestions.length === 0 ||
            state.currentQuestionIndex >= state.gameQuestions.length
        )
            return;

        const botTimers = state.players
            .filter((player) => player.isBot)
            .map((bot) => {
                return setTimeout(() => {
                    // Bot decides to answer or not
                    if (Math.random() > GAME_CONSTANTS.BOT.ANSWER_PROBABILITY)
                        return;

                    // Bot answers the question
                    dispatch({ type: "ANSWER_QUESTION", payload: bot.id });

                    // Bot submits an answer after thinking
                    setTimeout(() => {
                        const currentQuestion =
                            state.gameQuestions[state.currentQuestionIndex];

                        if (!currentQuestion) return; // Safety check

                        const isCorrectAnswer =
                            Math.random() < bot.correctnessRate;
                        const botAnswer = isCorrectAnswer
                            ? currentQuestion.answer
                            : `錯誤答案${Math.floor(Math.random() * 100)}`;

                        dispatch({ type: "SUBMIT_ANSWER", payload: botAnswer });

                        // Move to next question after delay
                        setTimeout(() => {
                            dispatch({ type: "NEXT_QUESTION" });
                        }, GAME_CONSTANTS.NEXT_QUESTION_DELAY);
                    }, GAME_CONSTANTS.BOT.THINKING_TIME_MIN + Math.random() * (GAME_CONSTANTS.BOT.THINKING_TIME_MAX - GAME_CONSTANTS.BOT.THINKING_TIME_MIN));
                }, bot.responseSpeed);
            });

        return () => botTimers.forEach((timer) => clearTimeout(timer));
    }, [
        state.currentScreen,
        state.currentQuestionIndex,
        state.showAnswer,
        state.answeringPlayerId,
        state.gameQuestions,
        state.players,
    ]);

    // Bot voting on appeals - completely decouple from automatic advancement
    useEffect(() => {
        if (!state.appealInProgress) return;

        const botVoters = state.players.filter(
            (player) => player.isBot && player.id !== state.appealPlayerId
        );

        // Have bots vote after a short delay
        const votingTimers = botVoters.map((bot) => {
            return setTimeout(() => {
                // Chance of accepting an appeal as specified
                const vote =
                    Math.random() < GAME_CONSTANTS.BOT.APPEAL_ACCEPT_PROBABILITY
                        ? "accept"
                        : "reject";

                // Just dispatch the vote - don't handle timer or advancement logic
                dispatch({
                    type: "VOTE_ON_APPEAL",
                    payload: { playerId: bot.id, vote },
                });

                // No vote resolution or advancement logic here
                // Let the GameScreen component handle all of this
            }, GAME_CONSTANTS.BOT.VOTING_DELAY_MIN + Math.random() * (GAME_CONSTANTS.BOT.VOTING_DELAY_MAX - GAME_CONSTANTS.BOT.VOTING_DELAY_MIN));
        });

        return () => votingTimers.forEach((timer) => clearTimeout(timer));
    }, [state.appealInProgress, state.appealPlayerId, state.players]);

    // Add this new effect to help debug the game state
    useEffect(() => {
        if (state.currentScreen === "game") {
            // Log for debugging
            console.log("Game state:", {
                questions: state.gameQuestions?.length || 0,
                currentIndex: state.currentQuestionIndex,
                currentQuestion:
                    state.gameQuestions?.[state.currentQuestionIndex],
            });

            // If the game has started but there are no questions, generate them
            if (!state.gameQuestions || state.gameQuestions.length === 0) {
                if (state.selectedTopics && state.selectedTopics.length > 0) {
                    const questions = generateQuestions(
                        state.selectedTopics,
                        GAME_CONSTANTS.QUESTIONS_PER_GAME
                    );

                    dispatch({
                        type: "SET_GAME_QUESTIONS",
                        payload: questions,
                    });
                } else {
                    console.error(
                        "No topics selected, cannot generate questions"
                    );
                }
            }
        }
    }, [
        state.currentScreen,
        state.gameQuestions,
        state.currentQuestionIndex,
        state.selectedTopics,
    ]);

    return (
        <GameContext.Provider value={{ state, dispatch, createBotPlayer }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => useContext(GameContext);
