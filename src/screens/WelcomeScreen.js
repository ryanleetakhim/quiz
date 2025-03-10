import React from "react";
import { useGame } from "../context/GameContext";

const WelcomeScreen = () => {
    const { dispatch } = useGame();

    const handleHostGame = () => {
        dispatch({ type: "NAVIGATE", payload: "host" });
    };

    const handleJoinGame = () => {
        dispatch({ type: "NAVIGATE", payload: "join" });
    };

    return (
        <div className="welcome-screen">
            <div className="welcome-container">
                <h1 className="game-title">知識問答</h1>
                <p className="game-subtitle">多人線上競賽</p>

                <div className="button-container">
                    <button className="btn-primary" onClick={handleHostGame}>
                        創建房間
                    </button>
                    <button className="btn-primary" onClick={handleJoinGame}>
                        加入房間
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
