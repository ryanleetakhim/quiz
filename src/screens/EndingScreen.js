import React from "react";
import { useGame } from "../context/GameContext";
import { GAME_CONSTANTS } from "../utils/constants";

const EndingScreen = () => {
    const { state, leaveRoom, returnToRoom } = useGame();

    // Sort players by score
    const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);

    const handleReturnToRoom = () => {
        returnToRoom();
    };

    const handleReturnToHome = () => {
        // Leave the room completely
        leaveRoom();
    };

    return (
        <div className="ending-screen">
            <div className="container">
                <h2>遊戲結束</h2>

                <div className="final-results">
                    <h3>最終排名</h3>

                    <div className="podium">
                        {sortedPlayers
                            .slice(0, GAME_CONSTANTS.PODIUM_SIZE)
                            .map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`podium-place place-${
                                        index + 1
                                    }`}
                                >
                                    <div className="position">{index + 1}</div>
                                    <div className="player-name">
                                        {player.name}{" "}
                                        {player.id === state.playerId
                                            ? "(你)"
                                            : ""}
                                    </div>
                                    <div className="player-score">
                                        {player.score} 分
                                    </div>
                                </div>
                            ))}
                    </div>

                    {sortedPlayers.length > GAME_CONSTANTS.PODIUM_SIZE && (
                        <div className="other-rankings">
                            {sortedPlayers
                                .slice(GAME_CONSTANTS.PODIUM_SIZE)
                                .map((player, index) => (
                                    <div
                                        key={player.id}
                                        className="ranking-item"
                                    >
                                        <div className="position">
                                            {index +
                                                GAME_CONSTANTS.PODIUM_SIZE +
                                                1}
                                        </div>
                                        <div className="player-name">
                                            {player.name}{" "}
                                            {player.id === state.playerId
                                                ? "(你)"
                                                : ""}
                                        </div>
                                        <div className="player-score">
                                            {player.score} 分
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                <div className="ending-actions">
                    <button
                        className="btn-primary"
                        onClick={handleReturnToRoom}
                    >
                        返回房間
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={handleReturnToHome}
                    >
                        返回首頁
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EndingScreen;
