const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const { nanoid } = require("nanoid");
const { checkAnswer } = require("./src/services/geminiService");
const { GAME_CONSTANTS } = require("./src/utils/constants"); // Import constants
const { google } = require("googleapis");
const sheets = google.sheets("v4");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Serve static files in production
app.use(express.static(path.join(__dirname, "build")));
app.use(express.json()); // Add this line to parse JSON request bodies

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Store active game rooms
const rooms = {};

// Socket.io connection handler
io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Create room handler
    socket.on("createRoom", (data) => {
        // Generate a 4-character room ID using nanoid
        const roomId = nanoid(4);

        const room = {
            id: roomId,
            name: data.roomName,
            isPrivate: data.isPrivate,
            password: data.isPrivate ? data.password : null,
            maxPlayers: data.maxPlayers,
            selectedTopics: data.selectedTopics,
            answerTimeLimit: data.answerTimeLimit,
            difficultyRange: data.difficultyRange,
            questionCount: data.questionCount,
            typewriterSpeed:
                data.typewriterSpeed || GAME_CONSTANTS.DEFAULT_TYPEWRITER_SPEED,
            players: [
                {
                    id: socket.id,
                    name: data.hostName,
                    isHost: true,
                    isReady: true,
                    score: 0,
                },
            ],
            gameState: { status: "waiting" },
        };

        // Store room in memory
        rooms[roomId] = room;

        // Join socket to room
        socket.join(roomId);
        socket.roomId = roomId; // Store room ID on socket object

        // Send confirmation to host
        socket.emit("roomCreated", { roomId, room });

        // Update room list for all clients
        io.emit("roomList", getPublicRooms());
    });

    // Handle fetching available rooms
    socket.on("fetchRooms", () => {
        socket.emit("roomList", getPublicRooms());
    });

    // Handle joining a room
    socket.on("joinRoom", (data) => {
        const roomId = data.roomId;
        const playerName = data.playerName;
        const password = data.password;

        if (!rooms[roomId]) {
            return socket.emit("error", { message: "Room not found" });
        }

        const room = rooms[roomId];

        // Check if room is full
        if (room.players.length >= room.maxPlayers) {
            return socket.emit("error", { message: "Room is full" });
        }

        // Check password for private rooms
        if (room.isPrivate && room.password !== password) {
            return socket.emit("error", { message: "Invalid password" });
        }

        // Add player to room
        const player = {
            id: socket.id,
            name: playerName,
            isHost: false,
            isReady: false,
            score: 0,
        };

        room.players.push(player);
        socket.join(roomId);
        socket.roomId = roomId;

        // Send join confirmation
        socket.emit("joinedRoom", {
            roomId: roomId,
            room: room,
        });

        // Notify everyone in the room about the new player
        io.to(roomId).emit("playerJoined", {
            player: player,
            players: room.players,
        });
    });

    // Handle updating room settings (by host)
    socket.on("updateRoomSettings", (newSettings) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) {
            return socket.emit("error", { message: "Room not found" });
        }

        const room = rooms[roomId];
        const player = room.players.find((p) => p.id === socket.id);

        // Only host can update settings, and only before game starts
        if (player && player.isHost && room.gameState.status === "waiting") {
            // Validate and update settings
            room.name = newSettings.roomName || room.name;
            room.isPrivate =
                typeof newSettings.isPrivate === "boolean"
                    ? newSettings.isPrivate
                    : room.isPrivate;
            if (room.isPrivate) {
                // Only update password if provided, otherwise keep the old one
                room.password = newSettings.password || room.password;
            } else {
                room.password = null; // Clear password if room becomes public
            }
            room.maxPlayers =
                newSettings.maxPlayers >= GAME_CONSTANTS.MIN_PLAYERS &&
                newSettings.maxPlayers <= GAME_CONSTANTS.MAX_PLAYERS
                    ? newSettings.maxPlayers
                    : room.maxPlayers;
            room.answerTimeLimit =
                newSettings.answerTimeLimit >= GAME_CONSTANTS.MIN_ANSWER_TIME &&
                newSettings.answerTimeLimit <= GAME_CONSTANTS.MAX_ANSWER_TIME
                    ? newSettings.answerTimeLimit
                    : room.answerTimeLimit;
            if (
                newSettings.difficultyRange &&
                typeof newSettings.difficultyRange.min === "number" &&
                typeof newSettings.difficultyRange.max === "number" &&
                newSettings.difficultyRange.min >= 1 &&
                newSettings.difficultyRange.max <= 10 &&
                newSettings.difficultyRange.min <
                    newSettings.difficultyRange.max
            ) {
                room.difficultyRange = newSettings.difficultyRange;
            }
            room.questionCount =
                newSettings.questionCount >=
                    GAME_CONSTANTS.MIN_QUESTIONS_PER_GAME &&
                newSettings.questionCount <=
                    GAME_CONSTANTS.MAX_QUESTIONS_PER_GAME
                    ? newSettings.questionCount
                    : room.questionCount;
            if (
                Array.isArray(newSettings.selectedTopics) &&
                newSettings.selectedTopics.length > 0
            ) {
                room.selectedTopics = newSettings.selectedTopics;
            }

            // Add typewriter speed validation
            if (
                typeof newSettings.typewriterSpeed === "number" &&
                newSettings.typewriterSpeed >=
                    GAME_CONSTANTS.MIN_TYPEWRITER_SPEED &&
                newSettings.typewriterSpeed <=
                    GAME_CONSTANTS.MAX_TYPEWRITER_SPEED
            ) {
                room.typewriterSpeed = newSettings.typewriterSpeed;
            }

            // Broadcast updated settings to all players in the room
            io.to(roomId).emit("roomSettingsUpdated", { room });

            // Update room list for lobby if public room settings changed
            if (!room.isPrivate) {
                io.emit("roomList", getPublicRooms());
            }
        } else if (!player || !player.isHost) {
            socket.emit("error", {
                message: "Only the host can change settings.",
            });
        } else if (room.gameState.status !== "waiting") {
            socket.emit("error", {
                message: "Cannot change settings after game has started.",
            });
        }
    });

    // Handle player ready toggle
    socket.on("toggleReady", () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        const player = room.players.find((p) => p.id === socket.id);

        if (player && !player.isHost) {
            player.isReady = !player.isReady;
            io.to(roomId).emit("playerUpdated", {
                player: player,
                players: room.players,
            });
        }
    });

    // Handle game start
    socket.on("startGame", (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        const player = room.players.find((p) => p.id === socket.id);

        if (player && player.isHost) {
            // Reset all player scores to 0 when starting a new game
            room.players.forEach((p) => {
                p.score = 0;
            });

            room.gameState = {
                ...room.gameState,
                status: "initializing", // Changed from "playing" to "initializing"
                gameQuestions: data.gameQuestions,
                currentQuestionIndex: 0,
            };

            // First emit game initialized event
            io.to(roomId).emit("gameStarted", {
                gameState: room.gameState,
            });

            // Wait for 2 seconds to ensure all clients have initialized
            setTimeout(() => {
                // Only proceed if the room still exists and is still initializing
                if (
                    rooms[roomId] &&
                    rooms[roomId].gameState.status === "initializing"
                ) {
                    rooms[roomId].gameState.status = "playing";

                    // Send an event to notify clients the game is truly starting
                    io.to(roomId).emit("gameReady", {
                        gameState: rooms[roomId].gameState,
                    });
                }
            }, 2000);
        }
    });

    // Handle answering question
    socket.on("answerQuestion", (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];

        // Store this attempt with its timestamp and the player's latency
        if (!room.answerAttempts) room.answerAttempts = [];

        room.answerAttempts.push({
            playerId: socket.id,
            clientTimestamp: data.clientTimestamp,
            serverTimestamp: Date.now(),
            latency: socket.latency || 0,
        });

        // Give a short window (e.g., 300ms) for other players with network disadvantages
        if (!room.answerSelectionTimeout) {
            room.answerSelectionTimeout = setTimeout(() => {
                // Sort by adjusted timestamp
                room.answerAttempts.sort(
                    (a, b) =>
                        a.clientTimestamp -
                        a.latency / 2 -
                        (b.clientTimestamp - b.latency / 2)
                );

                // Select the first player after adjustment
                const winner = room.answerAttempts[0];
                room.gameState.answeringPlayerId = winner.playerId;

                // Clear the attempts and timeout
                room.answerAttempts = [];
                room.answerSelectionTimeout = null;

                // Broadcast to all clients that typewriter should stop
                io.to(roomId).emit("typewriterInterrupted");

                // Notify clients
                io.to(roomId).emit("questionAnswering", {
                    playerId: winner.playerId,
                    gameState: room.gameState,
                });
            }, 300);
        }
    });

    // Handle answer submission
    socket.on("submitAnswer", async (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        if (
            room.gameState.status !== "playing" ||
            room.gameState.answeringPlayerId !== socket.id
        )
            return;

        const currentQuestion =
            room.gameState.gameQuestions[room.gameState.currentQuestionIndex];
        const isAnswered = data.answer !== "";
        let answerCheck = {
            isCorrect: false,
            confidence: 1.0,
            explanation: "使用者沒有提供任何答案，因此答案不正確。",
        };

        if (isAnswered) {
            // Use Gemini API to check the answer
            answerCheck = await checkAnswer(
                data.answer,
                currentQuestion.answer,
                currentQuestion.question
            );

            // Update question statistics in Google Sheets
            try {
                await updateQuestionStats(
                    currentQuestion.question,
                    answerCheck.isCorrect
                );
            } catch (error) {
                console.error("Failed to update question statistics:", error);
            }
        }

        // Update player score
        const player = room.players.find((p) => p.id === socket.id);
        if (player) {
            player.score += answerCheck.isCorrect ? 1 : -1;
        }

        room.gameState = {
            ...room.gameState,
            submittedAnswer: isAnswered ? data.answer : "(未回答)",
            correctAnswer: currentQuestion.answer,
            answerResult: answerCheck.isCorrect,
            showAnswer: true,
            answerExplanation: answerCheck.explanation,
        };

        io.to(roomId).emit("answerSubmitted", {
            gameState: room.gameState,
            players: room.players,
        });
    });

    // Handle appeal
    socket.on("appealAnswer", () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        if (!room.gameState.showAnswer || room.gameState.appealInProgress)
            return;

        room.gameState = {
            ...room.gameState,
            appealInProgress: true,
            appealPlayerId: socket.id,
            appealingAnswer: room.gameState.submittedAnswer,
            appealVotes: {},
            hasBeenAppealed: true,
        };

        io.to(roomId).emit("appealStarted", {
            gameState: room.gameState,
        });
    });

    // Handle vote on appeal
    socket.on("voteOnAppeal", (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        if (!room.gameState.appealInProgress) return;

        room.gameState.appealVotes[socket.id] = data.vote;

        io.to(roomId).emit("appealVoted", {
            voterId: socket.id,
            gameState: room.gameState,
        });

        // Check if all players have voted
        const eligibleVoters = room.players.filter(
            (p) => p.id !== room.gameState.appealPlayerId
        );
        const votesCount = Object.keys(room.gameState.appealVotes).length;
        const acceptVotes = Object.values(room.gameState.appealVotes).filter(
            (v) => v === "accept"
        ).length;
        const declineVotes = votesCount - acceptVotes;

        if (
            votesCount >= eligibleVoters.length ||
            declineVotes >= eligibleVoters.length / 2
        ) {
            resolveAppeal(roomId);
        }
    });

    // Handle next question
    socket.on("nextQuestion", () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        const player = room.players.find((p) => p.id === socket.id);

        if (player && player.isHost) {
            moveToNextQuestion(roomId);
        }
    });

    // Handle skip question
    socket.on("skipQuestion", () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        const player = room.players.find((p) => p.id === socket.id);

        // Only the host can skip questions
        if (player && player.isHost && !room.gameState.showAnswer) {
            const currentQuestion =
                room.gameState.gameQuestions[
                    room.gameState.currentQuestionIndex
                ];

            // Update game state to show the answer without affecting scores
            room.gameState = {
                ...room.gameState,
                submittedAnswer: "(已跳過)",
                correctAnswer: currentQuestion.answer,
                answerResult: false,
                showAnswer: true,
                answerExplanation: "此問題已被房主跳過。",
            };

            updateQuestionStats(currentQuestion.question, false);

            io.to(roomId).emit("answerSubmitted", {
                gameState: room.gameState,
                players: room.players,
            });
        }
    });

    // Handle return to room
    socket.on("returnToRoom", () => {
        const roomId = socket.roomId;
        console.log("Returning to room:", roomId);

        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];

        // Reset game state to waiting
        room.gameState = {
            ...room.gameState,
            status: "waiting",
        };

        // Reset ready status for non-host players
        room.players.forEach((player) => {
            if (!player.isHost) {
                player.isReady = false;
            }
        });

        // Notify all clients in the room
        io.to(roomId).emit("returnedToRoom", {
            players: room.players,
        });

        // Update public room list if room is public
        if (!room.isPrivate) {
            io.emit("roomList", getPublicRooms());
        }
    });

    // Handle player leaving
    socket.on("leaveRoom", () => {
        handlePlayerDisconnect(socket);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        handlePlayerDisconnect(socket);
    });
});

// Helper functions
function getPublicRooms() {
    return Object.values(rooms)
        .filter(
            (room) => !room.isPrivate && room.gameState.status === "waiting"
        )
        .map((room) => ({
            id: room.id,
            name: room.name,
            hostName:
                room.players.find((p) => p.isHost)?.name || "Unknown Host",
            playerCount: room.players.length,
            maxPlayers: room.maxPlayers,
        }));
}

function resolveAppeal(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    // Count votes
    const votes = Object.values(room.gameState.appealVotes);
    const acceptVotes = votes.filter((v) => v === "accept").length;
    const rejectVotes = votes.filter((v) => v === "reject").length;
    const appealPassed = acceptVotes > rejectVotes;

    // Update player score if appeal passed
    if (appealPassed) {
        const appealingPlayer = room.players.find(
            (p) => p.id === room.gameState.appealPlayerId
        );

        // Add 2 points: 1 to reverse the deduction and 1 for getting it right
        appealingPlayer.score += 2;
    }

    room.gameState = {
        ...room.gameState,
        appealInProgress: false,
        appealPassed: appealPassed,
        answerResult: appealPassed,
    };

    io.to(roomId).emit("appealResolved", {
        gameState: room.gameState,
        players: room.players,
    });
}

function moveToNextQuestion(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const nextIndex = room.gameState.currentQuestionIndex + 1;

    if (nextIndex >= room.gameState.gameQuestions.length) {
        // End game
        room.gameState.status = "ended";

        io.to(roomId).emit("gameEnded", {
            players: room.players,
        });
    } else {
        // Move to next question
        room.gameState = {
            ...room.gameState,
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
            hasBeenAppealed: false,
        };

        io.to(roomId).emit("nextQuestion", {
            gameState: room.gameState,
        });
    }
}

function handlePlayerDisconnect(socket) {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];
    const playerIndex = room.players.findIndex((p) => p.id === socket.id);

    if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);

        // Leave room
        socket.leave(roomId);
        socket.roomId = null;

        // If host left, either assign a new host or close the room
        if (player.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
            io.to(roomId).emit("hostChanged", {
                newHostId: room.players[0].id,
                players: room.players,
            });
        } else if (room.players.length === 0) {
            // Delete empty room
            delete rooms[roomId];
            io.emit("roomList", getPublicRooms());
            return;
        }

        // Notify room about player leaving
        io.to(roomId).emit("playerLeft", {
            playerId: player.id,
            players: room.players,
        });

        // Update public room list if needed
        if (!room.isPrivate && room.gameState.status === "waiting") {
            io.emit("roomList", getPublicRooms());
        }
    }
}

// Function to update question statistics in Google Sheets
async function updateQuestionStats(question, isCorrect) {
    try {
        // Load credentials from a service account key file
        const auth = new google.auth.GoogleAuth({
            keyFile:
                process.env.GOOGLE_APPLICATION_CREDENTIALS ||
                "./service-account-key.json",
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const authClient = await auth.getClient();
        const SPREADSHEET_ID = "1BcJDKw7gB6uYS0967lcObwAbCCs1Qr5LHghxl0_HFVc";

        // First, find the row index of the question
        const searchResponse = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: "questions!A2:A",
        });

        const questions = searchResponse.data.values || [];

        // Find the row with the matching question
        let rowIndex = -1;
        for (let i = 0; i < questions.length; i++) {
            if (questions[i][0] === question) {
                rowIndex = i + 2; // +2 because we start at row 2 (1-indexed) in the sheet
                break;
            }
        }

        if (rowIndex === -1) {
            console.warn(`Question not found in spreadsheet: ${question}`);
            return false;
        }

        // Now get the current stats for this question
        const statsRange = `questions!F${rowIndex}:G${rowIndex}`;
        const statsResponse = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: statsRange,
        });

        const currentStats =
            statsResponse.data.values && statsResponse.data.values[0]
                ? statsResponse.data.values[0]
                : [0, 0];

        // Update the stats
        const attempts = parseInt(currentStats[0] || 0) + 1;
        const correct = parseInt(currentStats[1] || 0) + (isCorrect ? 1 : 0);

        // Update the spreadsheet
        await sheets.spreadsheets.values.update({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: statsRange,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [[attempts, correct]],
            },
        });

        console.log(
            `Updated stats for question: attempts=${attempts}, correct=${correct}`
        );
        return true;
    } catch (error) {
        console.error("Error updating question statistics:", error);
        return false;
    }
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
