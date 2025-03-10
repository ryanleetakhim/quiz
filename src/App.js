import React from "react";
import { GameProvider } from "./context/GameContext";
import GameRouter from "./components/GameRouter";
import "./styles.css";

function App() {
    return (
        <GameProvider>
            <GameRouter />
        </GameProvider>
    );
}

export default App;
