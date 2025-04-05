const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { checkAnswer } = require("./src/services/geminiService");
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
        // Generate room ID
        const roomId = uuidv4(); // Changed from generateUniqueId() to uuidv4()

        // Create room object with host data
        const room = {
            id: roomId,
            name: data.roomName,
            isPrivate: data.isPrivate,
            password: data.isPrivate ? data.password : null,
            maxPlayers: data.maxPlayers,
            selectedTopics: data.selectedTopics,
            answerTimeLimit:
                data.answerTimeLimit || GAME_CONSTANTS.ANSWER_TIME_LIMIT, // Add this line
            players: [
                {
                    id: socket.id,
                    name: data.hostName,
                    isHost: true,
                    isReady: true,
                    score: 0,
                },
            ],
            gameState: { status: "waiting" }, // Initialize gameState object
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
            room.gameState = {
                ...room.gameState,
                status: "playing",
                gameQuestions: data.gameQuestions,
                currentQuestionIndex: 0,
            };

            io.to(roomId).emit("gameStarted", {
                gameState: room.gameState,
            });
        }
    });

    // Handle answering question
    socket.on("answerQuestion", () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        if (
            room.gameState.status !== "playing" ||
            room.gameState.answeringPlayerId
        )
            return;

        // Broadcast to all clients that typewriter should stop
        io.to(roomId).emit("typewriterInterrupted");

        room.gameState.answeringPlayerId = socket.id;

        io.to(roomId).emit("questionAnswering", {
            playerId: socket.id,
            gameState: room.gameState,
        });
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

        try {
            // Use Gemini API to check the answer
            const answerCheck = await checkAnswer(
                data.answer,
                currentQuestion.answer,
                currentQuestion.question
            );

            const isCorrect =
                answerCheck.isCorrect && answerCheck.confidence > 0.7;

            // Update player score
            const player = room.players.find((p) => p.id === socket.id);
            if (player) {
                if (isCorrect) {
                    player.score += 1;
                } else {
                    player.score -= 1;
                }
            }

            room.gameState = {
                ...room.gameState,
                submittedAnswer: data.answer,
                correctAnswer: currentQuestion.answer,
                answerResult: isCorrect,
                showAnswer: true,
                answerExplanation: answerCheck.explanation, // Store the explanation
            };

            io.to(roomId).emit("answerSubmitted", {
                gameState: room.gameState,
                players: room.players,
            });
        } catch (error) {
            console.error("Error processing answer:", error);

            // Fallback to exact matching if API fails
            const isCorrect =
                data.answer.toLowerCase().trim() ===
                currentQuestion.answer.toLowerCase().trim();

            // Update player score
            const player = room.players.find((p) => p.id === socket.id);
            if (player) {
                if (isCorrect) {
                    player.score += 1;
                } else {
                    player.score -= 1;
                }
            }

            room.gameState = {
                ...room.gameState,
                submittedAnswer: data.answer,
                correctAnswer: currentQuestion.answer,
                answerResult: isCorrect,
                showAnswer: true,
                answerExplanation:
                    "Answer checked by exact matching (API unavailable)",
            };

            io.to(roomId).emit("answerSubmitted", {
                gameState: room.gameState,
                players: room.players,
            });
        }
    });

    // Handle answer timeout
    socket.on("timeoutAnswer", () => {
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

        // Timeout is always incorrect
        const isCorrect = false;

        room.gameState = {
            ...room.gameState,
            submittedAnswer: "(時間到)",
            correctAnswer: currentQuestion.answer,
            answerResult: isCorrect,
            showAnswer: true,
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

        if (votesCount >= eligibleVoters.length) {
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
                room.players.find((p) => p.isHost)?.name || "Unknown Host", // Fix: get host name from players array
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
        if (appealingPlayer) {
            // Add 2 points: 1 to reverse the deduction and 1 for getting it right
            appealingPlayer.score += 2;
        }
    }

    room.gameState = {
        ...room.gameState,
        appealInProgress: false,
        appealPassed: appealPassed,
        answerResult: appealPassed ? true : room.gameState.answerResult,
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

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
