import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { GAME_CONSTANTS } from "../utils/constants";

const PlayerCard = ({ player, isCurrentPlayer, isHost, onToggleReady }) => (
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

    // Clear any errors when component mounts
    useEffect(() => {
        clearError();
    }, [clearError]);

    // Check if all non-host players are ready
    const allPlayersReady = () => {
        const nonHostPlayers = state.players.filter((player) => !player.isHost);
        return (
            nonHostPlayers.length > 0 &&
            nonHostPlayers.every((player) => player.isReady)
        );
    };

    const handleToggleReady = () => {
        toggleReady();
    };

    const handleStartGame = () => {
        startGame();
    };

    const handleLeaveRoom = () => {
        leaveRoom();
    };

    // Find the current player
    const currentPlayer = state.players.find(
        (player) => player.id === state.playerId
    );

    return (
        <div className="room-screen">
            <div className="container">
                <h2>{state.roomName}</h2>

                {state.error && (
                    <div className="error-message">{state.error}</div>
                )}

                <div className="room-info">
                    <div className="room-detail">
                        <span className="label">房間ID:</span> {state.roomId}
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
                                key={player.id}
                                player={player}
                                isCurrentPlayer={player.id === state.playerId}
                                isHost={state.isHost}
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
