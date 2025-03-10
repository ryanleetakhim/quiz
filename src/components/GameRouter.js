import React from "react";
import { useGame } from "../context/GameContext";
import WelcomeScreen from "../screens/WelcomeScreen";
import HostGameScreen from "../screens/HostGameScreen";
import JoinGameScreen from "../screens/JoinGameScreen";
import RoomScreen from "../screens/RoomScreen";
import GameScreen from "../screens/GameScreen";
import EndingScreen from "../screens/EndingScreen";

const GameRouter = () => {
    const { state } = useGame();

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

export default GameRouter;
