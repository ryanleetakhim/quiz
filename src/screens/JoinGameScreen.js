import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import { GAME_CONSTANTS } from "../utils/constants";

// Simulated available rooms
const availableRooms = [
    {
        id: "1",
        name: "知識大考驗",
        host: "問答大師",
        players: 2,
        maxPlayers: 4,
        isPrivate: false,
    },
    {
        id: "2",
        name: "香港歷史",
        host: "歷史迷",
        players: 1,
        maxPlayers: 4,
        isPrivate: true,
    },
    {
        id: "3",
        name: "動漫王者",
        host: "Anime達人",
        players: 3,
        maxPlayers: 5,
        isPrivate: false,
    },
    {
        id: "4",
        name: "理科天地",
        host: "科學家",
        players: 2,
        maxPlayers: 6,
        isPrivate: false,
    },
    {
        id: "5",
        name: "體育競技",
        host: "運動王",
        players: 1,
        maxPlayers: 3,
        isPrivate: true,
    },
];

const JoinGameScreen = () => {
    const { dispatch, createBotPlayer } = useGame();
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [playerName, setPlayerName] = useState("");
    const [password, setPassword] = useState("");
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [error, setError] = useState("");

    const handleRoomSelect = (room) => {
        setSelectedRoom(room);

        if (room.isPrivate) {
            setShowPasswordModal(true);
        }
    };

    const handleJoinRoom = () => {
        if (!playerName.trim()) {
            setError("請輸入你的名稱");
            return;
        }

        if (selectedRoom.isPrivate && !password.trim()) {
            setError("請輸入房間密碼");
            return;
        }

        // For private rooms, validate password (in real app this would be server-side)
        if (
            selectedRoom.isPrivate &&
            password !== GAME_CONSTANTS.MOCK_PASSWORD
        ) {
            // Mock password
            setError("密碼錯誤");
            return;
        }

        // Set room settings from selected room
        dispatch({
            type: "UPDATE_HOST_SETTINGS",
            payload: {
                roomName: selectedRoom.name,
                isPrivate: selectedRoom.isPrivate,
                password: password,
                maxPlayers: selectedRoom.maxPlayers,
                hostName: selectedRoom.host,
                playerName,
            },
        });

        // Set default topics (in real app these would come from the server)
        // Make sure to include more topics for variety
        dispatch({
            type: "SET_SELECTED_TOPICS",
            payload: [
                "地理",
                "文學",
                "文化",
                "娛樂",
                "歷史",
                "理科",
                "社會",
                "生活",
                "語言",
            ].map((topic) => topic),
        });

        // Create a new room with the selected room's host as the actual host
        // Instead of using CREATE_ROOM which makes the current user a host
        dispatch({ type: "CREATE_JOINED_ROOM" });

        // Add the user player with a unique ID
        const playerId = `player-${Date.now()}`;
        const playerObj = {
            id: playerId,
            name: playerName,
            isHost: false, // Make sure user is not host
            isReady: false,
            score: 0,
        };

        // Store the current player's ID in localStorage
        localStorage.setItem("currentPlayerId", playerId);

        dispatch({ type: "ADD_PLAYER", payload: playerObj });

        // Add some bot players
        const botNames = ["智多星", "問答王", "學霸", "知識通"];
        const numBots = Math.min(
            selectedRoom.maxPlayers - 2, // Leave room for host and player
            Math.floor(Math.random() * GAME_CONSTANTS.BOT.MAX_BOTS) + 1
        );

        for (let i = 0; i < numBots; i++) {
            const botName = botNames[i % botNames.length];
            const botPlayer = createBotPlayer(botName, `bot-${i}`);
            dispatch({ type: "ADD_PLAYER", payload: botPlayer });
        }

        // Navigate to room
        dispatch({ type: "NAVIGATE", payload: "room" });
    };

    const handleBack = () => {
        dispatch({ type: "NAVIGATE", payload: "welcome" });
    };

    return (
        <div className="join-screen">
            <div className="container">
                <h2>加入房間</h2>

                {error && <div className="error-message">{error}</div>}

                <div className="form-group">
                    <label>你的名稱</label>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="輸入你的名稱"
                    />
                </div>

                <div className="room-list-section">
                    <h3>可用房間</h3>
                    <table className="room-list">
                        <thead>
                            <tr>
                                <th>房間名稱</th>
                                <th>房主</th>
                                <th>人數</th>
                                <th>狀態</th>
                            </tr>
                        </thead>
                        <tbody>
                            {availableRooms.map((room) => (
                                <tr
                                    key={room.id}
                                    className={
                                        selectedRoom?.id === room.id
                                            ? "selected"
                                            : ""
                                    }
                                    onClick={() => handleRoomSelect(room)}
                                >
                                    <td>{room.name}</td>
                                    <td>{room.host}</td>
                                    <td>
                                        {room.players}/{room.maxPlayers}
                                    </td>
                                    <td>{room.isPrivate ? "私人" : "公開"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="button-group">
                    <button className="btn-secondary" onClick={handleBack}>
                        返回
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleJoinRoom}
                        disabled={
                            !selectedRoom ||
                            (selectedRoom.isPrivate && !showPasswordModal)
                        }
                    >
                        加入房間
                    </button>
                </div>
            </div>

            {showPasswordModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>私人房間</h3>
                        <p>請輸入房間密碼</p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="輸入密碼"
                            autoFocus
                        />
                        <div className="button-group">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                取消
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    handleJoinRoom();
                                }}
                            >
                                確認
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JoinGameScreen;
