import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import { GAME_CONSTANTS } from "../utils/constants";

const PlayerCard = ({ player, isUser, onToggleReady }) => (
    <div
        className={`player-card ${player.isReady ? "ready" : ""} ${
            player.isHost ? "host" : ""
        }`}
    >
        <div className="player-name">{player.name}</div>
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

        {!player.isHost && isUser && (
            <button
                className={`ready-button ${player.isReady ? "cancel" : ""}`}
                onClick={() => onToggleReady(player.id)}
            >
                {player.isReady ? "取消準備" : "準備"}
            </button>
        )}
    </div>
);

const RoomScreen = () => {
    const { state, dispatch } = useGame();
    const [allReady, setAllReady] = useState(false);

    // Find the user player (using localStorage ID)
    const userPlayerId = localStorage.getItem("currentPlayerId");
    const userPlayer = state.players.find(
        (player) => player.id === userPlayerId
    );
    const isHost = userPlayer?.isHost || false;

    // Check if all non-host players are ready
    useEffect(() => {
        const nonHostPlayers = state.players.filter((player) => !player.isHost);
        const allPlayersReady = nonHostPlayers.every(
            (player) => player.isReady
        );
        setAllReady(allPlayersReady && nonHostPlayers.length > 0);

        // Simulate bot players toggling ready state
        const interval = setInterval(() => {
            state.players.forEach((player) => {
                if (
                    player.isBot &&
                    !player.isHost && // Don't toggle ready for host bot
                    !player.isReady &&
                    Math.random() > GAME_CONSTANTS.BOT.READY_PROBABILITY
                ) {
                    dispatch({
                        type: "TOGGLE_PLAYER_READY",
                        payload: player.id,
                    });
                }
            });
        }, GAME_CONSTANTS.BOT.READY_DELAY_MIN);

        // If all players are ready and the host is a bot, simulate host starting the game
        if (allPlayersReady && state.players.find((p) => p.isHost && p.isBot)) {
            const hostStartTimeout = setTimeout(() => {
                dispatch({ type: "START_GAME" });
            }, GAME_CONSTANTS.HOST_START_GAME_DELAY || 3000); // Default 3 seconds

            return () => {
                clearInterval(interval);
                clearTimeout(hostStartTimeout);
            };
        }

        return () => clearInterval(interval);
    }, [state.players, dispatch]);

    const handleToggleReady = (playerId) => {
        dispatch({ type: "TOGGLE_PLAYER_READY", payload: playerId });
    };

    const handleStartGame = () => {
        if (isHost) {
            dispatch({ type: "START_GAME" });
        }
    };

    const handleLeaveRoom = () => {
        dispatch({ type: "NAVIGATE", payload: "welcome" });
    };

    return (
        <div className="room-screen">
            <div className="container">
                <h2>{state.roomName}</h2>
                <div className="room-info">
                    <div className="room-detail">
                        <span className="label">房主:</span> {state.hostName}
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
                                isUser={player.id === userPlayer?.id}
                                onToggleReady={handleToggleReady}
                            />
                        ))}
                    </div>
                </div>

                <div className="room-actions">
                    {isHost ? (
                        <button
                            className="btn-primary start-button"
                            onClick={handleStartGame}
                            disabled={!allReady}
                        >
                            開始遊戲
                        </button>
                    ) : (
                        <div className="waiting-message">
                            {allReady
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

export default RoomScreen;
