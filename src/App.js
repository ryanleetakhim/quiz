import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import WelcomeScreen from "./screens/WelcomeScreen";
import HostGameScreen from "./screens/HostGameScreen";
import JoinGameScreen from "./screens/JoinGameScreen";
import RoomScreen from "./screens/RoomScreen";
import GameScreen from "./screens/GameScreen";
import EndingScreen from "./screens/EndingScreen";
import "./styles.css";
import AdminScreen from "./screens/AdminScreen";

function App() {
    return (
        <GameProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<WelcomeScreen />} />
                    <Route path="/aq" element={<AdminScreen />} />
                    <Route path="/host" element={<HostGameScreen />} />
                    <Route path="/join" element={<JoinGameScreen />} />
                    <Route path="/room/:roomId" element={<RoomScreen />} />
                    <Route path="/game/:roomId" element={<GameScreen />} />
                    <Route path="/ending/:roomId" element={<EndingScreen />} />
                    <Route path="*" element={<WelcomeScreen />} />{" "}
                </Routes>
            </BrowserRouter>
        </GameProvider>
    );
}

export default App;
