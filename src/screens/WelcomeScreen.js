import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const WelcomeScreen = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const handleHostGame = () => {
        navigate("/host");
    };

    const handleJoinGame = () => {
        navigate("/join");
    };

    return (
        <div className="welcome-screen">
            <button
                className="theme-toggle-button"
                onClick={toggleTheme}
                aria-label={`Switch to ${
                    theme === "light" ? "dark" : "light"
                } mode`}
            >
                {theme === "light" ? "🌙" : "☀️"}
            </button>
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
