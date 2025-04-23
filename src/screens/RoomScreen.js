import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import hooks
import { useGame } from "../context/GameContext";

const PlayerCard = ({ player, isCurrentPlayer, onToggleReady }) => (
    <div
        className={`player-card ${player.isReady ? "ready" : ""} ${
            player.isHost ? "host" : ""
        }`}
    >
        <div className="player-name">
            {player.name} {isCurrentPlayer ? "(你)" : ""}
        </div>
        <div className="player-status">
            {player.isHost ? (
                <span className="host-badge">房主</span>
            ) : (
                <span
                    className={`ready-status ${
                        player.isReady ? "is-ready" : ""
                    }`}
                >
                    {player.isReady ? "已準備" : "未準備"}
                </span>
            )}
        </div>

        {!player.isHost && isCurrentPlayer && (
            <button
                className={`ready-button ${player.isReady ? "cancel" : ""}`}
                onClick={onToggleReady}
            >
                {player.isReady ? "取消準備" : "準備"}
            </button>
        )}
    </div>
);

const RoomScreen = () => {
    const { state, toggleReady, startGame, leaveRoom, clearError } = useGame();
    const { roomId } = useParams(); // Get roomId from URL
    const navigate = useNavigate(); // Use navigate hook

    // Clear any errors when component mounts
    useEffect(() => {
        clearError();
        // Optional: If state.roomId doesn't match URL roomId, maybe leave/redirect?
        // Or emit an event to sync state if needed, depends on desired behavior for direct URL access.
        if (state.roomId && state.roomId !== roomId) {
            console.warn("State roomId mismatch with URL roomId");
            // Decide how to handle mismatch, e.g., navigate('/') or leaveRoom()
        }
    }, [clearError, roomId, state.roomId]);

    // Navigate to game screen when game starts
    useEffect(() => {
        // Check for a reliable indicator that the game has started
        // Using gameQuestions length and index might be more robust than a flag
        if (
            state.gameQuestions &&
            state.gameQuestions.length > 0 &&
            state.currentQuestionIndex === 0 &&
            !state.gameEnded // Ensure game hasn't ended immediately
        ) {
            navigate(`/game/${roomId}`);
        }
    }, [
        state.gameQuestions,
        state.currentQuestionIndex,
        state.gameEnded,
        roomId,
        navigate,
    ]);

    // Check if all non-host players are ready
    const allPlayersReady = () => {
        const nonHostPlayers = state.players.filter((player) => !player.isHost);
        return nonHostPlayers.every((player) => player.isReady);
    };

    const handleToggleReady = () => {
        toggleReady();
    };

    const handleStartGame = () => {
        // startGame just emits, navigation handled by useEffect
        startGame();
    };

    const handleLeaveRoom = () => {
        leaveRoom(); // Dispatch LEAVE_ROOM action
        navigate("/"); // Navigate back to welcome screen
    };

    // Display roomId from URL or state
    const displayRoomId = roomId || state.roomId;

    return (
        <div className="room-screen">
            <div className="container">
                <h2>{state.roomName || `房間 ${displayRoomId}`}</h2>

                {state.error && (
                    <div className="error-message">{state.error}</div>
                )}

                <div className="room-info">
                    <div className="room-detail">
                        <span className="label">房間ID:</span> {displayRoomId}
                    </div>
                    <div className="room-detail">
                        <span className="label">玩家:</span>{" "}
                        {state.players.length}/{state.maxPlayers}
                    </div>
                    <div className="room-detail">
                        <span className="label">狀態:</span>{" "}
                        {state.isPrivate ? "私人" : "公開"}
                    </div>
                </div>

                <div className="player-list-section">
                    <h3>玩家列表</h3>
                    <div className="player-grid">
                        {state.players.map((player) => (
                            <PlayerCard
                                player={player}
                                isCurrentPlayer={player.id === state.playerId}
                                onToggleReady={handleToggleReady}
                            />
                        ))}
                    </div>
                </div>

                <div className="room-actions">
                    {state.isHost ? (
                        <button
                            className="btn-primary start-button"
                            onClick={handleStartGame}
                            disabled={!allPlayersReady()}
                        >
                            開始遊戲
                        </button>
                    ) : (
                        <div className="waiting-message">
                            {allPlayersReady()
                                ? "所有玩家已準備，等待房主開始遊戲..."
                                : "等待所有玩家準備好..."}
                        </div>
                    )}

                    <button className="btn-secondary" onClick={handleLeaveRoom}>
                        離開房間
                    </button>
                </div>
            </div>
        </div>
    );
};

// Make sure the component is properly exported
export default RoomScreen;
