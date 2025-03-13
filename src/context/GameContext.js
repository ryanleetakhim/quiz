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

// Socket.io connection
const socket = io("http://192.168.0.23:3001");

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
    hasBeenAppealed: false,
    roomId: null,
    availableRooms: [],
    socketConnected: false,
    isHost: false,
    playerId: null,
    error: null,
};

// Game state reducer
function gameReducer(state, action) {
    switch (action.type) {
        case "NAVIGATE":
            return { ...state, currentScreen: action.payload };

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
                currentScreen: "room",
                roomId: action.payload.roomId,
                roomName: action.payload.room.name,
                players: action.payload.room.players,
                selectedTopics: action.payload.room.selectedTopics,
                isHost: true,
            };

        case "JOINED_ROOM":
            return {
                ...state,
                currentScreen: "room",
                roomId: action.payload.roomId,
                roomName: action.payload.room.name,
                players: action.payload.room.players,
                selectedTopics: action.payload.room.selectedTopics,
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
            // Just send selected topics - the server will generate or receive questions
            socket.emit("startGame", {
                gameQuestions: generateQuestions(
                    state.selectedTopics,
                    GAME_CONSTANTS.QUESTIONS_PER_GAME
                ),
            });
            return state;

        case "GAME_STARTED":
            return {
                ...state,
                currentScreen: "game",
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
            socket.emit("answerQuestion");
            return state;

        case "QUESTION_ANSWERING":
            return {
                ...state,
                answeringPlayerId: action.payload.playerId,
                showAnswer: false,
            };

        case "SUBMIT_ANSWER":
            socket.emit("submitAnswer", { answer: action.payload });
            return state;

        case "TIMEOUT_ANSWER":
            socket.emit("timeoutAnswer");
            return state;

        case "ANSWER_SUBMITTED":
            return {
                ...state,
                submittedAnswer: action.payload.gameState.submittedAnswer,
                correctAnswer: action.payload.gameState.correctAnswer,
                answerResult: action.payload.gameState.answerResult,
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
            };

        case "GAME_ENDED":
            return {
                ...state,
                currentScreen: "ending",
                gameEnded: true,
                players: action.payload.players,
            };

        case "RETURN_TO_ROOM":
            return {
                ...state,
                currentScreen: "room",
                players: state.players.map((player) =>
                    player.isHost ? player : { ...player, isReady: false }
                ),
            };

        case "LEAVE_ROOM":
            socket.emit("leaveRoom");
            return {
                ...state,
                currentScreen: "welcome",
                roomId: null,
                players: [],
                isHost: false,
            };

        case "TOGGLE_PLAYER_READY":
            socket.emit("toggleReady");
            return state;

        default:
            return state;
    }
}

export const GameProvider = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    // Set up socket event listeners
    useEffect(() => {
        // Define event handler functions OUTSIDE the effect body
        const handleRoomCreated = (data) => {
            dispatch({ type: "ROOM_CREATED", payload: data });
        };

        const handlePlayerJoined = (data) => {
            dispatch({ type: "PLAYER_JOINED", payload: data });
        };

        const handlePlayerLeft = (data) => {
            dispatch({ type: "PLAYER_LEFT", payload: data });
        };

        const handleHostChanged = (data) => {
            dispatch({ type: "HOST_CHANGED", payload: data });
        };

        const handlePlayerUpdated = (data) => {
            dispatch({ type: "PLAYER_UPDATED", payload: data });
        };

        // Add debugging for game events
        const handleGameStarted = (data) => {
            console.log("Game started event received:", data);

            if (
                !data.gameState ||
                !Array.isArray(data.gameState.gameQuestions) ||
                data.gameState.gameQuestions.length === 0
            ) {
                console.error("Invalid game state received:", data);
                dispatch({
                    type: "SET_ERROR",
                    payload: "無效的遊戲數據。請重新開始遊戲。",
                });
                return;
            }

            dispatch({ type: "GAME_STARTED", payload: data });
        };

        const handleQuestionAnswering = (data) => {
            dispatch({ type: "QUESTION_ANSWERING", payload: data });
        };

        const handleAnswerSubmitted = (data) => {
            dispatch({ type: "ANSWER_SUBMITTED", payload: data });
        };

        const handleAppealStarted = (data) => {
            dispatch({ type: "APPEAL_STARTED", payload: data });
        };

        const handleAppealVoted = (data) => {
            dispatch({ type: "APPEAL_VOTED", payload: data });
        };

        const handleAppealResolved = (data) => {
            dispatch({ type: "APPEAL_RESOLVED", payload: data });
        };

        const handleNextQuestion = (data) => {
            dispatch({ type: "QUESTION_ADVANCED", payload: data });
        };

        const handleGameEnded = (data) => {
            dispatch({ type: "GAME_ENDED", payload: data });
        };

        // Connection events
        socket.on("connect", () => {
            console.log("Connected to server");
            dispatch({ type: "SET_SOCKET_CONNECTED" });
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from server");
            dispatch({ type: "SET_SOCKET_CONNECTED", payload: false });
        });

        // Error handling
        socket.on("error", (data) => {
            console.error("Socket error:", data.message);
            dispatch({ type: "SET_ERROR", payload: data.message });
        });

        // Room events
        socket.on("roomList", (rooms) => {
            dispatch({ type: "SET_AVAILABLE_ROOMS", payload: rooms });
        });

        socket.on("roomCreated", handleRoomCreated);
        socket.on("joinedRoom", (data) => {
            dispatch({ type: "JOINED_ROOM", payload: data });
        });

        socket.on("playerJoined", handlePlayerJoined);
        socket.on("playerLeft", handlePlayerLeft);
        socket.on("hostChanged", handleHostChanged);
        socket.on("playerUpdated", handlePlayerUpdated);

        // Game events
        socket.on("gameStarted", handleGameStarted);
        socket.on("questionAnswering", handleQuestionAnswering);
        socket.on("answerSubmitted", handleAnswerSubmitted);
        socket.on("appealStarted", handleAppealStarted);
        socket.on("appealVoted", handleAppealVoted);
        socket.on("appealResolved", handleAppealResolved);
        socket.on("nextQuestion", handleNextQuestion);
        socket.on("gameEnded", handleGameEnded);

        // Get available rooms on connection
        socket.emit("getRoomList");

        // Clean up event listeners on unmount
        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("error");
            socket.off("roomList");
            socket.off("roomCreated", handleRoomCreated);
            socket.off("joinedRoom");
            socket.off("playerJoined", handlePlayerJoined);
            socket.off("playerLeft", handlePlayerLeft);
            socket.off("hostChanged", handleHostChanged);
            socket.off("playerUpdated", handlePlayerUpdated);
            socket.off("gameStarted", handleGameStarted);
            socket.off("questionAnswering", handleQuestionAnswering);
            socket.off("answerSubmitted", handleAnswerSubmitted);
            socket.off("appealStarted", handleAppealStarted);
            socket.off("appealVoted", handleAppealVoted);
            socket.off("appealResolved", handleAppealResolved);
            socket.off("nextQuestion", handleNextQuestion);
            socket.off("gameEnded", handleGameEnded);
        };
    }, []);

    // Helper functions for API calls
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

    // Update the startGame function to add better error handling
    const startGame = () => {
        try {
            const questions = generateQuestions(
                state.selectedTopics,
                GAME_CONSTANTS.QUESTIONS_PER_GAME
            );

            if (!questions || questions.length === 0) {
                dispatch({
                    type: "SET_ERROR",
                    payload: "無法生成問題。請確保至少選擇了一個主題。",
                });
                return;
            }

            console.log(`Starting game with ${questions.length} questions`);
            socket.emit("startGame", { gameQuestions: questions });
        } catch (error) {
            console.error("Error starting game:", error);
            dispatch({
                type: "SET_ERROR",
                payload: "啟動遊戲時發生錯誤，請重試。",
            });
        }
    };

    const leaveRoom = () => {
        dispatch({ type: "LEAVE_ROOM" });
    };

    // Add fetchAvailableRooms function
    const fetchAvailableRooms = useCallback(() => {
        socket.emit("fetchRooms");
    }, []);

    // Wrap clearError with useCallback to maintain stable reference
    const clearError = useCallback(() => {
        dispatch({ type: "CLEAR_ERROR" });
    }, []);

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
            }}
        >
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => useContext(GameContext);
