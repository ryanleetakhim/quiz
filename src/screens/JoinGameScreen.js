import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import ConnectionStatus from "../components/ConnectionStatus";

const JoinGameScreen = () => {
    const { state, dispatch, joinRoom, fetchAvailableRooms, clearError } =
        useGame();
    const [playerName, setPlayerName] = useState("");
    const [selectedRoomId, setSelectedRoomId] = useState("");
    const [password, setPassword] = useState("");
    const [joinType, setJoinType] = useState("public"); // "public" or "private"

    // Fetch available rooms when component mounts and periodically
    useEffect(() => {
        // Clear any previous errors
        clearError();

        // Fetch rooms immediately
        fetchAvailableRooms();

        // Set up periodic refresh of room list
        const interval = setInterval(() => {
            fetchAvailableRooms();
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [fetchAvailableRooms, clearError]);

    // Handle form submission for joining a public room
    const handleJoinPublicRoom = (e) => {
        e.preventDefault();
        if (!playerName.trim()) {
            dispatch({
                type: "SET_ERROR",
                payload: "請輸入玩家名稱",
            });
            return;
        }

        if (!selectedRoomId) {
            dispatch({
                type: "SET_ERROR",
                payload: "請選擇一個房間",
            });
            return;
        }

        joinRoom(selectedRoomId, playerName);
    };

    // Handle form submission for joining a private room
    const handleJoinPrivateRoom = (e) => {
        e.preventDefault();
        if (!playerName.trim()) {
            dispatch({
                type: "SET_ERROR",
                payload: "請輸入玩家名稱",
            });
            return;
        }

        if (!selectedRoomId.trim()) {
            dispatch({
                type: "SET_ERROR",
                payload: "請輸入房間ID",
            });
            return;
        }

        joinRoom(selectedRoomId, playerName, password);
    };

    // Handle going back to welcome screen
    const handleBackToWelcome = () => {
        dispatch({ type: "NAVIGATE", payload: "welcome" });
    };

    return (
        <div className="join-game-screen">
            <div className="container">
                <h2>加入遊戲</h2>
                <ConnectionStatus />

                {state.error && (
                    <div className="error-message">{state.error}</div>
                )}

                <div className="join-type-selector">
                    <button
                        className={`join-type-button ${
                            joinType === "public" ? "active" : ""
                        }`}
                        onClick={() => setJoinType("public")}
                    >
                        公開房間
                    </button>
                    <button
                        className={`join-type-button ${
                            joinType === "private" ? "active" : ""
                        }`}
                        onClick={() => setJoinType("private")}
                    >
                        私人房間
                    </button>
                </div>

                {joinType === "public" ? (
                    <div className="public-rooms-section">
                        <h3>可加入的房間</h3>

                        {state.availableRooms.length === 0 ? (
                            <div className="no-rooms-message">
                                目前沒有可加入的公開房間
                            </div>
                        ) : (
                            <div className="room-list">
                                {state.availableRooms.map((room) => (
                                    <div
                                        key={room.id}
                                        className={`room-item ${
                                            selectedRoomId === room.id
                                                ? "selected"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setSelectedRoomId(room.id)
                                        }
                                    >
                                        <div className="room-name">
                                            {room.name}
                                        </div>
                                        <div className="room-host">
                                            房主: {room.hostName}
                                        </div>
                                        <div className="room-players">
                                            玩家: {room.playerCount}/
                                            {room.maxPlayers}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <form
                            onSubmit={handleJoinPublicRoom}
                            className="join-form"
                        >
                            <div className="form-group">
                                <label htmlFor="playerName">玩家名稱:</label>
                                <input
                                    type="text"
                                    id="playerName"
                                    value={playerName}
                                    onChange={(e) =>
                                        setPlayerName(e.target.value)
                                    }
                                    placeholder="輸入你的玩家名稱"
                                    required
                                />
                            </div>

                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={
                                        !selectedRoomId || !playerName.trim()
                                    }
                                >
                                    加入房間
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleBackToWelcome}
                                >
                                    返回
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="private-room-section">
                        <h3>加入私人房間</h3>

                        <form
                            onSubmit={handleJoinPrivateRoom}
                            className="join-form"
                        >
                            <div className="form-group">
                                <label htmlFor="playerNamePrivate">
                                    玩家名稱:
                                </label>
                                <input
                                    type="text"
                                    id="playerNamePrivate"
                                    value={playerName}
                                    onChange={(e) =>
                                        setPlayerName(e.target.value)
                                    }
                                    placeholder="輸入你的玩家名稱"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="roomId">房間ID:</label>
                                <input
                                    type="text"
                                    id="roomId"
                                    value={selectedRoomId}
                                    onChange={(e) =>
                                        setSelectedRoomId(e.target.value)
                                    }
                                    placeholder="輸入房間ID"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">房間密碼:</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="輸入房間密碼"
                                />
                            </div>

                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={
                                        !selectedRoomId.trim() ||
                                        !playerName.trim()
                                    }
                                >
                                    加入房間
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleBackToWelcome}
                                >
                                    返回
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="refresh-section">
                    <button
                        className="btn-refresh"
                        onClick={fetchAvailableRooms}
                    >
                        刷新房間列表
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinGameScreen;
