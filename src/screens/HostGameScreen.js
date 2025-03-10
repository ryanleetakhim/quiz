import React, { useState } from "react";
import { useGame } from "../context/GameContext";
import { useQuestionData } from "../data/questionBank";
import { GAME_CONSTANTS } from "../utils/constants";

const TopicItem = ({ topic, isSelected, onClick }) => (
    <div
        className={`topic-item ${isSelected ? "selected" : ""}`}
        onClick={onClick}
    >
        {topic.name}
    </div>
);

const HostGameScreen = () => {
    const { dispatch, createBotPlayer } = useGame();
    const [roomName, setRoomName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState("");
    const [maxPlayers, setMaxPlayers] = useState(
        GAME_CONSTANTS.DEFAULT_MAX_PLAYERS
    );
    const [hostName, setHostName] = useState("");
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [error, setError] = useState("");

    // Use the hook to get topics
    const { topics, loading } = useQuestionData();

    // Remove debug logs in production
    // useEffect(() => {
    //     console.log("Topics loaded:", topics);
    //     console.log("Selected topics:", selectedTopics);
    // }, [topics, selectedTopics]);

    const handleTopicToggle = (topicId) => {
        if (selectedTopics.includes(topicId)) {
            setSelectedTopics(selectedTopics.filter((id) => id !== topicId));
        } else {
            setSelectedTopics([...selectedTopics, topicId]);
        }
    };

    const handleCreateRoom = () => {
        if (!roomName) {
            setError("請輸入房間名稱");
            return;
        }

        if (isPrivate && !password) {
            setError("私人房間需要密碼");
            return;
        }

        if (!hostName) {
            setError("請輸入你的名稱");
            return;
        }

        if (selectedTopics.length === 0) {
            setError("請至少選擇一個主題");
            return;
        }

        dispatch({
            type: "UPDATE_HOST_SETTINGS",
            payload: { roomName, isPrivate, password, maxPlayers, hostName },
        });

        dispatch({ type: "SET_SELECTED_TOPICS", payload: selectedTopics });

        // Create room and store host ID
        dispatch({ type: "CREATE_ROOM" });
        localStorage.setItem("currentPlayerId", "host");

        // Add bot players automatically
        addBotPlayers(maxPlayers);
    };

    // Function to add bot players
    const addBotPlayers = (maxPlayers) => {
        const botNames = [
            "智多星",
            "問答王",
            "學霸",
            "知識通",
            "數學迷",
            "歷史通",
            "科學家",
        ];

        // Randomly decide how many bots to add
        const numBots = Math.min(
            Math.floor(
                Math.random() *
                    (GAME_CONSTANTS.BOT.MAX_BOTS -
                        GAME_CONSTANTS.BOT.MIN_BOTS +
                        1)
            ) + GAME_CONSTANTS.BOT.MIN_BOTS,
            maxPlayers - 1 // Leave room for the host
        );

        // Shuffle bot names to get random ones
        const shuffledNames = [...botNames].sort(() => 0.5 - Math.random());

        // Add the bots with slight delays to simulate joining
        for (let i = 0; i < numBots; i++) {
            const botName = shuffledNames[i];
            const botPlayer = createBotPlayer(botName, `bot-${i}`);

            // Add bot with a slight delay to simulate joining
            setTimeout(() => {
                dispatch({ type: "ADD_PLAYER", payload: botPlayer });

                // Make bot get ready after a random delay
                setTimeout(() => {
                    dispatch({
                        type: "TOGGLE_PLAYER_READY",
                        payload: botPlayer.id,
                    });
                }, (i + 1) * GAME_CONSTANTS.BOT.READY_DELAY_MIN + Math.random() * (GAME_CONSTANTS.BOT.READY_DELAY_MAX - GAME_CONSTANTS.BOT.READY_DELAY_MIN));
            }, i * GAME_CONSTANTS.BOT.JOIN_DELAY);
        }
    };

    const handleCancel = () => {
        dispatch({ type: "NAVIGATE", payload: "welcome" });
    };

    // Simplify loading condition - can be combined with the empty check below
    if (loading || !topics || topics.length === 0) {
        return (
            <div className="host-screen">
                <div className="container">
                    <h2>開設房間</h2>
                    <div className="error-message">
                        {loading
                            ? "載入主題中..."
                            : "無法載入題目類別，請重新整理頁面"}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="host-screen">
            <div className="container">
                <h2>開設房間</h2>

                {error && <div className="error-message">{error}</div>}

                <div className="form-section">
                    <div className="form-group">
                        <label>房間名稱</label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="輸入房間名稱"
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <input
                            type="checkbox"
                            id="private-room"
                            checked={isPrivate}
                            onChange={() => setIsPrivate(!isPrivate)}
                        />
                        <label htmlFor="private-room">私人房間</label>
                    </div>

                    {isPrivate && (
                        <div className="form-group">
                            <label>密碼</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="輸入房間密碼"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>最大玩家數: {maxPlayers}</label>
                        <input
                            type="range"
                            min={GAME_CONSTANTS.MIN_PLAYERS}
                            max={GAME_CONSTANTS.MAX_PLAYERS}
                            value={maxPlayers}
                            onChange={(e) =>
                                setMaxPlayers(parseInt(e.target.value))
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label>你的名稱</label>
                        <input
                            type="text"
                            value={hostName}
                            onChange={(e) => setHostName(e.target.value)}
                            placeholder="輸入你的名稱"
                        />
                    </div>
                </div>

                <div className="topic-selection">
                    <h3>選擇題目類別</h3>
                    {topics.length > 0 ? (
                        <div className="topics-grid">
                            {topics.map((topic) => (
                                <TopicItem
                                    key={topic.id}
                                    topic={topic}
                                    isSelected={selectedTopics.includes(
                                        topic.id
                                    )}
                                    onClick={() => handleTopicToggle(topic.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="no-topics-message">
                            無法載入題目類別，請重新整理頁面
                        </div>
                    )}

                    <div className="selected-topics">
                        <h3>已選擇的主題 ({selectedTopics.length})</h3>
                        <div className="selected-topics-box">
                            {selectedTopics.length === 0 ? (
                                <p className="empty-message">
                                    拖曳或點擊主題來選擇
                                </p>
                            ) : (
                                <div className="selected-topics-list">
                                    {selectedTopics.map((topicId) => {
                                        const topic = topics.find(
                                            (t) => t.id === topicId
                                        );
                                        return (
                                            <div
                                                key={topicId}
                                                className="selected-topic-tag"
                                            >
                                                {topic.name}
                                                <button
                                                    className="remove-topic"
                                                    onClick={() =>
                                                        handleTopicToggle(
                                                            topicId
                                                        )
                                                    }
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="button-group">
                    <button className="btn-secondary" onClick={handleCancel}>
                        取消
                    </button>
                    <button className="btn-primary" onClick={handleCreateRoom}>
                        建立房間
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HostGameScreen;
