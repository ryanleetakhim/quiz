import React, { useState, useEffect } from "react";
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
    const { state, createRoom, clearError } = useGame();
    const [roomName, setRoomName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState("");
    const [maxPlayers, setMaxPlayers] = useState(
        GAME_CONSTANTS.DEFAULT_MAX_PLAYERS
    );
    const [hostName, setHostName] = useState("");
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [error, setError] = useState("");
    const [answerTimeLimit, setAnswerTimeLimit] = useState(
        GAME_CONSTANTS.DEFAULT_ANSWER_TIME_LIMIT
    );
    const [minDifficulty, setMinDifficulty] = useState(1);
    const [maxDifficulty, setMaxDifficulty] = useState(10);
    const [questionCount, setQuestionCount] = useState(
        GAME_CONSTANTS.DEFAULT_QUESTIONS_PER_GAME
    );
    const { topics, loading } = useQuestionData();

    // Clear any global errors when component mounts
    useEffect(() => {
        clearError();
    }, []);

    // Show error from state if present
    useEffect(() => {
        if (state.error) {
            setError(state.error);
        }
    }, [state.error]);

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

        setError("");
        createRoom({
            roomName,
            isPrivate,
            password,
            maxPlayers,
            hostName,
            selectedTopics,
            answerTimeLimit,
            difficultyRange: {
                min: minDifficulty,
                max: maxDifficulty,
            },
            questionCount,
        });
    };

    const handleCancel = () => {
        window.location.href = "/";
    };

    // Simplify loading condition
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
                        <label>答題時間限制: {answerTimeLimit} 秒</label>
                        <input
                            type="range"
                            min={GAME_CONSTANTS.MIN_ANSWER_TIME}
                            max={GAME_CONSTANTS.MAX_ANSWER_TIME}
                            value={answerTimeLimit}
                            onChange={(e) =>
                                setAnswerTimeLimit(parseInt(e.target.value))
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            題目難度範圍: {minDifficulty.toFixed(1)} -{" "}
                            {maxDifficulty.toFixed(1)}
                        </label>
                        <div className="difficulty-sliders">
                            <div className="min-difficulty">
                                <small>
                                    最低難度: {minDifficulty.toFixed(1)}
                                </small>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={minDifficulty}
                                    onChange={(e) => {
                                        const value = parseFloat(
                                            e.target.value
                                        );
                                        setMinDifficulty(
                                            Math.min(value, maxDifficulty - 0.1)
                                        );
                                    }}
                                />
                            </div>
                            <div className="max-difficulty">
                                <small>
                                    最高難度: {maxDifficulty.toFixed(1)}
                                </small>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={maxDifficulty}
                                    onChange={(e) => {
                                        const value = parseFloat(
                                            e.target.value
                                        );
                                        setMaxDifficulty(
                                            Math.max(value, minDifficulty + 0.1)
                                        );
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>題目數量: {questionCount}</label>
                        <input
                            type="range"
                            min={GAME_CONSTANTS.MIN_QUESTIONS_PER_GAME}
                            max={GAME_CONSTANTS.MAX_QUESTIONS_PER_GAME}
                            value={questionCount}
                            onChange={(e) =>
                                setQuestionCount(parseInt(e.target.value))
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
                                    請點擊主題來選擇
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
