import React, {
    createContext,
    useContext,
    useReducer,
    useEffect,
    useCallback,
} from "react";
import { generateQuestions } from "../data/questionBank";
import { GAME_CONSTANTS } from "../utils/constants";
import io from "socket.io-client";

const GameContext = createContext();
const socket = io(window.location.origin);

const initialState = {
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
    hasBeenAppealed: false,
    roomId: null,
    availableRooms: [],
    socketConnected: false,
    isHost: false,
    playerId: null,
    error: null,
    typewriterInterrupted: false,
    difficultyRange: { min: 1, max: 10 },
    questionCount: GAME_CONSTANTS.DEFAULT_QUESTIONS_PER_GAME,
};

function gameReducer(state, action) {
    switch (action.type) {
        case "SET_SOCKET_CONNECTED":
            return { ...state, socketConnected: true, playerId: socket.id };

        case "UPDATE_HOST_SETTINGS":
            return { ...state, ...action.payload };

        case "SET_SELECTED_TOPICS":
            return { ...state, selectedTopics: action.payload };

        case "SET_AVAILABLE_ROOMS":
            return { ...state, availableRooms: action.payload };

        case "SET_PLAYER_NAME":
            return { ...state, playerName: action.payload };

        case "SET_ERROR":
            return { ...state, error: action.payload };

        case "CLEAR_ERROR":
            return { ...state, error: null };

        case "ROOM_CREATED":
            return {
                ...state,
                roomId: action.payload.roomId,
                roomName: action.payload.room.name,
                players: action.payload.room.players,
                selectedTopics: action.payload.room.selectedTopics,
                answerTimeLimit: action.payload.room.answerTimeLimit,
                difficultyRange: action.payload.room.difficultyRange,
                questionCount: action.payload.room.questionCount,
                maxPlayers: action.payload.room.maxPlayers,
                isHost: true,
            };

        case "JOINED_ROOM":
            return {
                ...state,
                roomId: action.payload.roomId,
                roomName: action.payload.room.name,
                players: action.payload.room.players,
                selectedTopics: action.payload.room.selectedTopics,
                answerTimeLimit: action.payload.room.answerTimeLimit,
                difficultyRange: action.payload.room.difficultyRange,
                questionCount: action.payload.room.questionCount,
                maxPlayers: action.payload.room.maxPlayers,
                isHost: false,
            };

        case "PLAYER_JOINED":
            return {
                ...state,
                players: action.payload.players,
            };

        case "PLAYER_LEFT":
            return {
                ...state,
                players: action.payload.players,
            };

        case "HOST_CHANGED":
            return {
                ...state,
                players: action.payload.players,
                isHost: action.payload.newHostId === socket.id,
            };

        case "PLAYER_UPDATED":
            return {
                ...state,
                players: action.payload.players,
            };

        case "START_GAME":
            socket.emit("startGame", {
                gameQuestions: generateQuestions(
                    state.selectedTopics,
                    state.questionCount,
                    state.difficultyRange
                ),
            });
            return state;

        case "GAME_STARTED":
            return {
                ...state,
                gameQuestions: action.payload.gameState.gameQuestions,
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
            socket.emit("answerQuestion", { clientTimestamp: action.payload });
            return state;

        case "TYPEWRITER_INTERRUPTED":
            return {
                ...state,
                typewriterInterrupted: true,
            };

        case "QUESTION_ANSWERING":
            return {
                ...state,
                answeringPlayerId: action.payload.playerId,
                showAnswer: false,
                typewriterInterrupted: true,
            };

        case "SUBMIT_ANSWER":
            socket.emit("submitAnswer", { answer: action.payload });
            return state;

        case "ANSWER_SUBMITTED":
            return {
                ...state,
                submittedAnswer: action.payload.gameState.submittedAnswer,
                correctAnswer: action.payload.gameState.correctAnswer,
                answerResult: action.payload.gameState.answerResult,
                answerExplanation: action.payload.gameState.answerExplanation,
                showAnswer: true,
                players: action.payload.players,
            };

        case "APPEAL_ANSWER":
            socket.emit("appealAnswer");
            return state;

        case "APPEAL_STARTED":
            return {
                ...state,
                appealInProgress: true,
                appealPlayerId: action.payload.gameState.appealPlayerId,
                appealingAnswer: action.payload.gameState.appealingAnswer,
                appealVotes: {},
                appealPassed: null,
                hasBeenAppealed: true,
            };

        case "VOTE_ON_APPEAL":
            socket.emit("voteOnAppeal", {
                vote: action.payload.vote,
                shouldPass: action.payload.shouldPass,
                allVoted: action.payload.allVoted,
            });
            return state;

        case "APPEAL_VOTED":
            return {
                ...state,
                appealVotes: action.payload.gameState.appealVotes,
            };

        case "APPEAL_RESOLVED":
            return {
                ...state,
                appealInProgress: false,
                appealPassed: action.payload.gameState.appealPassed,
                answerResult: action.payload.gameState.answerResult,
                players: action.payload.players,
            };

        case "NEXT_QUESTION":
            if (state.isHost) {
                socket.emit("nextQuestion");
            }
            return state;

        case "QUESTION_ADVANCED":
            return {
                ...state,
                currentQuestionIndex:
                    action.payload.gameState.currentQuestionIndex,
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
                hasBeenAppealed: false,
                typewriterInterrupted: false,
            };

        case "GAME_ENDED":
            return {
                ...state,
                gameEnded: true,
                players: action.payload.players,
            };

        case "RETURN_TO_ROOM":
            return {
                ...state,
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
                hasBeenAppealed: false,
                typewriterInterrupted: false,
                players: state.players.map((player) =>
                    player.isHost ? player : { ...player, isReady: false }
                ),
            };

        case "LEAVE_ROOM":
            socket.emit("leaveRoom");
            return {
                ...initialState,
                socketConnected: state.socketConnected,
                playerId: state.playerId,
                availableRooms: state.availableRooms,
            };

        case "TOGGLE_PLAYER_READY":
            socket.emit("toggleReady");
            return state;

        case "SKIP_QUESTION":
            socket.emit("skipQuestion");
            return state;

        default:
            return state;
    }
}

export const GameProvider = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    useEffect(() => {
        socket.on("connect", () => {
            dispatch({ type: "SET_SOCKET_CONNECTED" });
        });
        socket.on("disconnect", () => {
            dispatch({ type: "SET_SOCKET_CONNECTED", payload: false });
        });
        socket.on("error", (data) => {
            dispatch({ type: "SET_ERROR", payload: data.message });
        });
        socket.on("roomList", (rooms) => {
            dispatch({ type: "SET_AVAILABLE_ROOMS", payload: rooms });
        });
        socket.on("roomCreated", (data) => {
            dispatch({ type: "ROOM_CREATED", payload: data });
        });
        socket.on("joinedRoom", (data) => {
            dispatch({ type: "JOINED_ROOM", payload: data });
        });
        socket.on("playerJoined", (data) => {
            dispatch({ type: "PLAYER_JOINED", payload: data });
        });
        socket.on("playerLeft", (data) => {
            dispatch({ type: "PLAYER_LEFT", payload: data });
        });
        socket.on("hostChanged", (data) => {
            dispatch({ type: "HOST_CHANGED", payload: data });
        });
        socket.on("playerUpdated", (data) => {
            dispatch({ type: "PLAYER_UPDATED", payload: data });
        });
        socket.on("gameStarted", (data) => {
            dispatch({ type: "GAME_STARTED", payload: data });
        });
        socket.on("questionAnswering", (data) => {
            dispatch({ type: "QUESTION_ANSWERING", payload: data });
        });
        socket.on("answerSubmitted", (data) => {
            dispatch({ type: "ANSWER_SUBMITTED", payload: data });
        });
        socket.on("appealStarted", (data) => {
            dispatch({ type: "APPEAL_STARTED", payload: data });
        });
        socket.on("appealVoted", (data) => {
            dispatch({ type: "APPEAL_VOTED", payload: data });
        });
        socket.on("appealResolved", (data) => {
            dispatch({ type: "APPEAL_RESOLVED", payload: data });
        });
        socket.on("nextQuestion", (data) => {
            dispatch({ type: "QUESTION_ADVANCED", payload: data });
        });
        socket.on("gameEnded", (data) => {
            dispatch({ type: "GAME_ENDED", payload: data });
        });
        socket.on("typewriterInterrupted", () => {
            dispatch({ type: "TYPEWRITER_INTERRUPTED" });
        });

        socket.emit("getRoomList");

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("error");
            socket.off("roomList");
            socket.off("roomCreated");
            socket.off("joinedRoom");
            socket.off("playerJoined");
            socket.off("playerLeft");
            socket.off("hostChanged");
            socket.off("playerUpdated");
            socket.off("gameStarted");
            socket.off("questionAnswering");
            socket.off("answerSubmitted");
            socket.off("appealStarted");
            socket.off("appealVoted");
            socket.off("appealResolved");
            socket.off("nextQuestion");
            socket.off("gameEnded");
            socket.off("typewriterInterrupted");
        };
    }, []);

    const createRoom = (roomData) => {
        socket.emit("createRoom", roomData);
    };

    const joinRoom = (roomId, playerName, password = "") => {
        socket.emit("joinRoom", {
            roomId,
            playerName,
            password,
        });
    };

    const toggleReady = () => {
        socket.emit("toggleReady");
    };

    const startGame = () => {
        try {
            const questions = generateQuestions(
                state.selectedTopics,
                state.questionCount,
                state.difficultyRange
            );

            if (!questions || questions.length === 0) {
                dispatch({
                    type: "SET_ERROR",
                    payload: "無法生成題目。請選擇不同的主題或檢查連接。",
                });
                return;
            }

            console.log(`Starting game with ${questions.length} questions`);
            socket.emit("startGame", { gameQuestions: questions });
        } catch (error) {
            console.error("Error starting game:", error);
            dispatch({
                type: "SET_ERROR",
                payload: "啟動遊戲時出錯。請重試。",
            });
        }
    };

    const leaveRoom = () => {
        dispatch({ type: "LEAVE_ROOM" });
    };

    const fetchAvailableRooms = useCallback(() => {
        socket.emit("fetchRooms");
    }, []);

    const clearError = useCallback(() => {
        dispatch({ type: "CLEAR_ERROR" });
    }, []);

    const returnToRoom = () => {
        socket.emit("returnToRoom");
        dispatch({ type: "RETURN_TO_ROOM" });
    };

    return (
        <GameContext.Provider
            value={{
                state,
                dispatch,
                createRoom,
                joinRoom,
                toggleReady,
                startGame,
                leaveRoom,
                clearError,
                fetchAvailableRooms,
                returnToRoom,
            }}
        >
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => useContext(GameContext);
