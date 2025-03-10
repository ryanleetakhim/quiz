import React from "react";
import { GameProvider, useGame } from "./context/GameContext";
import WelcomeScreen from "./screens/WelcomeScreen";
import HostGameScreen from "./screens/HostGameScreen";
import JoinGameScreen from "./screens/JoinGameScreen";
import RoomScreen from "./screens/RoomScreen";
import GameScreen from "./screens/GameScreen";
import EndingScreen from "./screens/EndingScreen";
import "./styles.css";

const GameRouter = () => {
    const { state } = useGame();

    // Render the appropriate screen based on the current state
    switch (state.currentScreen) {
        case "welcome":
            return <WelcomeScreen />;
        case "host":
            return <HostGameScreen />;
        case "join":
            return <JoinGameScreen />;
        case "room":
            return <RoomScreen />;
        case "game":
            return <GameScreen />;
        case "ending":
            return <EndingScreen />;
        default:
            return <WelcomeScreen />;
    }
};

function App() {
    return (
        <GameProvider>
            <GameRouter />
        </GameProvider>
    );
}

export default App;
