import React from "react";
import { useGame } from "../context/GameContext";

const ConnectionStatus = () => {
    const { state } = useGame();

    if (state.socketConnected) {
        return (
            <div className="connection-status connected">
                <span className="status-icon">●</span> 已連接
            </div>
        );
    } else {
        return (
            <div className="connection-status disconnected">
                <span className="status-icon">●</span> 連線中...
            </div>
        );
    }
};

export default ConnectionStatus;
