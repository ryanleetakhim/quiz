import React, { useState, useEffect } from "react"; // Import useState
import { useParams, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { useQuestionData } from "../data/questionBank"; // Import topic data hook
import { GAME_CONSTANTS } from "../utils/constants"; // Import constants

// Reusable TopicItem component (or move to a shared file)
const TopicItem = ({ topic, isSelected, onClick }) => (
    <div
        className={`topic-item ${isSelected ? "selected" : ""}`}
        onClick={onClick}
    >
        {topic.name}
    </div>
);

const PlayerCard = ({ player, isCurrentPlayer, onToggleReady }) => (
    <div
        className={`player-card ${player.isReady ? "ready" : ""} ${
            player.isHost ? "host" : ""
        }`}
    >
        <div className="player-name">
            {player.name} {isCurrentPlayer ? "(你)" : ""}
        </div>
        <div className="player-status">
            {player.isHost ? (
                <span className="host-badge">房主</span>
            ) : (
                <span
                    className={`ready-status ${
                        player.isReady ? "is-ready" : ""
                    }`}
                >
                    {player.isReady ? "已準備" : "未準備"}
                </span>
            )}
        </div>

        {!player.isHost && isCurrentPlayer && (
            <button
                className={`ready-button ${player.isReady ? "cancel" : ""}`}
                onClick={onToggleReady}
            >
                {player.isReady ? "取消準備" : "準備"}
            </button>
        )}
    </div>
);

const RoomScreen = () => {
    const {
        state,
        toggleReady,
        startGame,
        leaveRoom,
        clearError,
        updateRoomSettings, // Get the update function
    } = useGame();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { topics, loading: topicsLoading } = useQuestionData(); // Load topics

    // Local state for editing settings (only used by host)
    const [editableSettings, setEditableSettings] = useState(null);
    const [showSettingsEditor, setShowSettingsEditor] = useState(false);
    const [settingsError, setSettingsError] = useState("");

    // Initialize editable settings when host enters or settings change
    useEffect(() => {
        if (state.isHost) {
            setEditableSettings({
                roomName: state.roomName,
                isPrivate: state.isPrivate,
                password: "", // Don't prefill password for security
                maxPlayers: state.maxPlayers,
                selectedTopics: state.selectedTopics,
                answerTimeLimit: state.answerTimeLimit,
                difficultyRange: state.difficultyRange,
                questionCount: state.questionCount,
            });
        } else {
            setEditableSettings(null); // Clear if not host
            setShowSettingsEditor(false); // Hide editor if not host
        }
        // Reset local error when global error clears or settings change
        setSettingsError("");
    }, [
        state.isHost,
        state.roomName,
        state.isPrivate,
        state.maxPlayers,
        state.selectedTopics,
        state.answerTimeLimit,
        state.difficultyRange,
        state.questionCount,
        state.error, // Also react to global errors potentially related to settings
    ]);

    // Clear global errors when component mounts
    useEffect(() => {
        clearError();
        if (state.roomId && state.roomId !== roomId) {
            console.warn("State roomId mismatch with URL roomId");
        }
    }, [clearError, roomId, state.roomId]);

    // Navigate to game screen when game starts
    useEffect(() => {
        if (
            state.gameQuestions &&
            state.gameQuestions.length > 0 &&
            state.currentQuestionIndex === 0 &&
            !state.gameEnded
        ) {
            navigate(`/game/${roomId}`);
        }
    }, [
        state.gameQuestions,
        state.currentQuestionIndex,
        state.gameEnded,
        roomId,
        navigate,
    ]);

    const allPlayersReady = () => {
        const nonHostPlayers = state.players.filter((player) => !player.isHost);
        // Ensure there's at least one non-host player before checking readiness
        return (
            nonHostPlayers.length > 0 &&
            nonHostPlayers.every((player) => player.isReady)
        );
    };

    const handleToggleReady = () => {
        toggleReady();
    };

    const handleStartGame = () => {
        startGame();
    };

    const handleLeaveRoom = () => {
        leaveRoom();
        navigate("/");
    };

    // --- Settings Editor Logic (Host only) ---
    const handleSettingChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditableSettings((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleRangeSettingChange = (name, value) => {
        setEditableSettings((prev) => ({
            ...prev,
            [name]: parseInt(value, 10),
        }));
    };

    const handleDifficultyChange = (type, value) => {
        const floatValue = parseFloat(value);
        setEditableSettings((prev) => {
            const currentRange = prev.difficultyRange;
            let newMin = currentRange.min;
            let newMax = currentRange.max;

            if (type === "min") {
                newMin = Math.min(floatValue, currentRange.max - 0.1);
            } else {
                newMax = Math.max(floatValue, currentRange.min + 0.1);
            }
            return {
                ...prev,
                difficultyRange: { min: newMin, max: newMax },
            };
        });
    };

    const handleTopicToggle = (topicId) => {
        setEditableSettings((prev) => {
            const currentTopics = prev.selectedTopics;
            if (currentTopics.includes(topicId)) {
                return {
                    ...prev,
                    selectedTopics: currentTopics.filter(
                        (id) => id !== topicId
                    ),
                };
            } else {
                return {
                    ...prev,
                    selectedTopics: [...currentTopics, topicId],
                };
            }
        });
    };

    const handleSaveSettings = () => {
        setSettingsError(""); // Clear previous errors
        // Basic validation
        if (!editableSettings.roomName) {
            setSettingsError("房間名稱不能為空");
            return;
        }
        if (editableSettings.isPrivate && !editableSettings.password) {
            // Note: We only send password if it's newly entered.
            // The server keeps the old one if this field is empty.
            // However, if switching TO private, a password might be expected.
            // Let's prompt:
            setSettingsError("切換為私人房間時，建議設定新密碼");
            // Or enforce: setSettingsError("私人房間需要密碼"); return;
        }
        if (editableSettings.selectedTopics.length === 0) {
            setSettingsError("請至少選擇一個主題");
            return;
        }

        // Send update to server via context
        updateRoomSettings(editableSettings);
        setShowSettingsEditor(false); // Close editor after saving
    };
    // --- End Settings Editor Logic ---

    const displayRoomId = roomId || state.roomId;

    // Helper to get topic names
    const getSelectedTopicNames = () => {
        if (topicsLoading || !topics || topics.length === 0) {
            return "載入中...";
        }
        if (!state.selectedTopics || state.selectedTopics.length === 0) {
            return "未選擇";
        }
        return state.selectedTopics
            .map((topicId) => {
                const topic = topics.find((t) => t.id === topicId);
                return topic ? topic.name : "未知主題";
            })
            .join(", ");
    };

    return (
        <div className="room-screen">
            <div className="container">
                {/* Display Room Name from context state */}
                <h2>{state.roomName || `房間 ${displayRoomId}`}</h2>

                {/* Display Global Error */}
                {state.error && (
                    <div className="error-message global-error">
                        {state.error}
                    </div>
                )}
                {/* Display Local Settings Error */}
                {settingsError && (
                    <div className="error-message settings-error">
                        {settingsError}
                    </div>
                )}

                <div className="room-info">
                    {/* Display details from context state */}
                    <div className="room-detail">
                        <span className="label">房間ID:</span> {displayRoomId}
                    </div>
                    <div className="room-detail">
                        <span className="label">玩家:</span>{" "}
                        {state.players.length}/{state.maxPlayers}
                    </div>
                    <div className="room-detail">
                        <span className="label">狀態:</span>{" "}
                        {state.isPrivate ? "私人" : "公開"}
                    </div>
                    <div className="room-detail">
                        <span className="label">答題時間:</span>{" "}
                        {state.answerTimeLimit} 秒
                    </div>
                    <div className="room-detail">
                        <span className="label">題目數量:</span>{" "}
                        {state.questionCount}
                    </div>
                    <div className="room-detail">
                        <span className="label">難度:</span>{" "}
                        {state.difficultyRange?.min?.toFixed(1)} -{" "}
                        {state.difficultyRange?.max?.toFixed(1)}
                    </div>
                    {/* Add display for selected topics */}
                    <div className="room-detail">
                        <span className="label">主題:</span>{" "}
                        {getSelectedTopicNames()}
                    </div>
                </div>

                {/* Settings Editor Button (Host Only) */}
                {state.isHost && (
                    <button
                        className="btn-secondary toggle-settings-btn"
                        onClick={() =>
                            setShowSettingsEditor(!showSettingsEditor)
                        }
                    >
                        {showSettingsEditor ? "隱藏設定" : "修改房間設定"}
                    </button>
                )}

                {/* Settings Editor Form (Host Only & Visible when toggled) */}
                {state.isHost && showSettingsEditor && editableSettings && (
                    <div className="settings-editor form-section">
                        <h3>修改房間設定</h3>

                        {/* Room Name */}
                        <div className="form-group">
                            <label>房間名稱</label>
                            <input
                                type="text"
                                name="roomName"
                                value={editableSettings.roomName}
                                onChange={handleSettingChange}
                            />
                        </div>

                        {/* Privacy */}
                        <div className="form-group checkbox-group">
                            <input
                                type="checkbox"
                                id="edit-private-room"
                                name="isPrivate"
                                checked={editableSettings.isPrivate}
                                onChange={handleSettingChange}
                            />
                            <label htmlFor="edit-private-room">私人房間</label>
                        </div>

                        {/* Password (only if private) */}
                        {editableSettings.isPrivate && (
                            <div className="form-group">
                                <label>新密碼 (留空則不變)</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={editableSettings.password}
                                    onChange={handleSettingChange}
                                    placeholder="輸入新密碼或留空"
                                />
                            </div>
                        )}

                        {/* Max Players */}
                        <div className="form-group">
                            <label>
                                最大玩家數: {editableSettings.maxPlayers}
                            </label>
                            <input
                                type="range"
                                name="maxPlayers"
                                min={GAME_CONSTANTS.MIN_PLAYERS}
                                max={GAME_CONSTANTS.MAX_PLAYERS}
                                value={editableSettings.maxPlayers}
                                onChange={(e) =>
                                    handleRangeSettingChange(
                                        "maxPlayers",
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        {/* Answer Time Limit */}
                        <div className="form-group">
                            <label>
                                答題時間限制: {editableSettings.answerTimeLimit}{" "}
                                秒
                            </label>
                            <input
                                type="range"
                                name="answerTimeLimit"
                                min={GAME_CONSTANTS.MIN_ANSWER_TIME}
                                max={GAME_CONSTANTS.MAX_ANSWER_TIME}
                                value={editableSettings.answerTimeLimit}
                                onChange={(e) =>
                                    handleRangeSettingChange(
                                        "answerTimeLimit",
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        {/* Difficulty Range */}
                        <div className="form-group">
                            <label>
                                題目難度範圍:{" "}
                                {editableSettings.difficultyRange.min.toFixed(
                                    1
                                )}{" "}
                                -{" "}
                                {editableSettings.difficultyRange.max.toFixed(
                                    1
                                )}
                            </label>
                            <div className="difficulty-sliders">
                                {/* Min Difficulty */}
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={editableSettings.difficultyRange.min}
                                    onChange={(e) =>
                                        handleDifficultyChange(
                                            "min",
                                            e.target.value
                                        )
                                    }
                                />
                                {/* Max Difficulty */}
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.1"
                                    value={editableSettings.difficultyRange.max}
                                    onChange={(e) =>
                                        handleDifficultyChange(
                                            "max",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        {/* Question Count */}
                        <div className="form-group">
                            <label>
                                題目數量: {editableSettings.questionCount}
                            </label>
                            <input
                                type="range"
                                name="questionCount"
                                min={GAME_CONSTANTS.MIN_QUESTIONS_PER_GAME}
                                max={GAME_CONSTANTS.MAX_QUESTIONS_PER_GAME}
                                value={editableSettings.questionCount}
                                onChange={(e) =>
                                    handleRangeSettingChange(
                                        "questionCount",
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        {/* Topic Selection */}
                        <div className="topic-selection">
                            <h3>選擇題目類別</h3>
                            {topicsLoading ? (
                                <div>載入主題中...</div>
                            ) : topics && topics.length > 0 ? (
                                <div className="topics-grid">
                                    {topics.map((topic) => (
                                        <TopicItem
                                            key={topic.id}
                                            topic={topic}
                                            isSelected={editableSettings.selectedTopics.includes(
                                                topic.id
                                            )}
                                            onClick={() =>
                                                handleTopicToggle(topic.id)
                                            }
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div>無法載入主題</div>
                            )}
                        </div>

                        {/* Save Button */}
                        <div className="button-group">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowSettingsEditor(false)}
                            >
                                取消
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveSettings}
                            >
                                儲存設定
                            </button>
                        </div>
                    </div>
                )}

                <div className="player-list-section">
                    <h3>玩家列表</h3>
                    <div className="player-grid">
                        {state.players.map((player) => (
                            <PlayerCard
                                key={player.id} // Add key prop
                                player={player}
                                isCurrentPlayer={player.id === state.playerId}
                                onToggleReady={handleToggleReady}
                            />
                        ))}
                    </div>
                </div>

                <div className="room-actions">
                    {state.isHost ? (
                        <button
                            className="btn-primary start-button"
                            onClick={handleStartGame}
                            disabled={!allPlayersReady()}
                        >
                            開始遊戲
                        </button>
                    ) : (
                        // ... existing waiting message ...
                        <div className="waiting-message">
                            {allPlayersReady()
                                ? "所有玩家已準備，等待房主開始遊戲..."
                                : "等待所有玩家準備好..."}
                        </div>
                    )}

                    <button className="btn-secondary" onClick={handleLeaveRoom}>
                        離開房間
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoomScreen;
