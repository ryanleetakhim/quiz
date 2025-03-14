import React, { useState, useEffect, useRef } from "react";
import { useGame } from "../context/GameContext";
import { GAME_CONSTANTS } from "../utils/constants";

const TypewriterEffect = ({ text, onInterrupt }) => {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);
    const intervalRef = useRef(null);
    const charIndex = useRef(0);
    const { state } = useGame(); // Access the global game state

    useEffect(() => {
        // Reset when text changes
        charIndex.current = 0;
        setDisplayedText("");
        setIsComplete(false);

        // Type out text character by character
        const interval = setInterval(() => {
            if (charIndex.current < text.length) {
                setDisplayedText(text.substring(0, charIndex.current + 1));
                charIndex.current++;
            } else {
                clearInterval(interval);
                setIsComplete(true);
            }
        }, GAME_CONSTANTS.TYPEWRITER_SPEED);

        intervalRef.current = interval;

        return () => clearInterval(interval);
    }, [text]);

    // Add effect to respond to global typewriter interrupt
    useEffect(() => {
        if (state.typewriterInterrupted && !isComplete) {
            clearInterval(intervalRef.current);
            // Don't set displayedText to full text, just stop the animation
            // and keep the currently displayed partial text
            setIsComplete(true);
        }
    }, [state.typewriterInterrupted, isComplete, text]);

    const handleClick = () => {
        if (!isComplete) {
            clearInterval(intervalRef.current);
            // Don't set the full text, just keep what's already shown
            setIsComplete(true);
            if (onInterrupt) onInterrupt();
        }
    };

    return (
        <div className="typewriter" onClick={handleClick}>
            {displayedText}
        </div>
    );
};

const GameScreen = () => {
    const { state, dispatch } = useGame();
    const [answer, setAnswer] = useState("");
    const [timeLeft, setTimeLeft] = useState(null);
    const timerRef = useRef(null);
    const [loadingError, setLoadingError] = useState(false);

    // Add a function to get better color transitions for the timer
    const getTimerColor = (time) => {
        const totalTime = GAME_CONSTANTS.ANSWER_TIME_LIMIT;
        const percentRemaining = time / totalTime;

        if (percentRemaining <= 0.25) {
            return "#FF0000"; // Bright red when very low
        } else if (percentRemaining <= 0.5) {
            return "#FFA500"; // Orange when getting low
        } else {
            return "#00CC00"; // Green when plenty of time
        }
    };

    const currentQuestion =
        state.gameQuestions && state.gameQuestions.length > 0
            ? state.gameQuestions[state.currentQuestionIndex]
            : null;
    const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);

    // Determine if current player is answering
    const isAnswering = state.answeringPlayerId === state.playerId;

    // Determine if current player can appeal
    const canAppeal =
        state.showAnswer &&
        !state.answerResult &&
        state.answeringPlayerId === state.playerId &&
        !state.hasBeenAppealed;

    // Start timer function
    const startTimer = (duration, onComplete) => {
        clearInterval(timerRef.current);
        setTimeLeft(duration);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    if (onComplete) onComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Handle user wanting to answer the question
    const handleAnswerQuestion = () => {
        if (!state.answeringPlayerId && !state.showAnswer) {
            dispatch({ type: "ANSWER_QUESTION" });
            // Use the room-specific timer setting instead of constant
            startTimer(
                state.answerTimeLimit || GAME_CONSTANTS.ANSWER_TIME_LIMIT,
                () => {
                    // Time's up - submit empty answer
                    if (isAnswering) {
                        dispatch({ type: "SUBMIT_ANSWER", payload: "" });
                    }
                }
            );
        }
    };

    // Handle submit answer
    const handleSubmitAnswer = (e) => {
        e.preventDefault();
        clearInterval(timerRef.current);
        dispatch({ type: "SUBMIT_ANSWER", payload: answer.trim() });
        setAnswer("");
    };

    // Handle appeal
    const handleAppeal = () => {
        dispatch({ type: "APPEAL_ANSWER" });
    };

    // Calculate if appeal should pass based on current votes plus new vote
    const calculateAppealResult = (newVote) => {
        // Copy current votes and add the new vote
        const allVotes = { ...state.appealVotes, [state.playerId]: newVote };
        const votes = Object.values(allVotes);
        const acceptCount = votes.filter((v) => v === "accept").length;
        const rejectCount = votes.filter((v) => v === "reject").length;

        // Check if all eligible voters have voted
        const eligibleVoters = state.players.filter(
            (p) => p.id !== state.appealPlayerId
        ).length;
        const allVoted = votes.length >= eligibleVoters;

        // Appeal passes if majority voted to accept
        const shouldPass = acceptCount > rejectCount;

        return { shouldPass, allVoted };
    };

    // Handle voting on appeal
    const handleVoteOnAppeal = (vote) => {
        const { shouldPass, allVoted } = calculateAppealResult(vote);
        dispatch({
            type: "VOTE_ON_APPEAL",
            payload: { vote, shouldPass, allVoted },
        });
    };

    // NEW: Handle progressing to next question (for host)
    const handleNextQuestion = () => {
        dispatch({ type: "NEXT_QUESTION" });
    };

    // Clean up timer when component unmounts or question changes
    useEffect(() => {
        return () => clearInterval(timerRef.current);
    }, [state.currentQuestionIndex]);

    // Check if user has already voted on appeal
    const hasVotedOnAppeal = () => {
        return state.appealVotes && state.appealVotes[state.playerId];
    };

    // Get vote counts for display
    const getVoteCounts = () => {
        const votes = Object.values(state.appealVotes || {});
        return {
            accept: votes.filter((v) => v === "accept").length,
            reject: votes.filter((v) => v === "reject").length,
        };
    };

    // Get remaining votes count
    const getRemainingVotes = () => {
        const eligibleVoters = state.players.filter(
            (p) => p.id !== state.appealPlayerId
        );
        return (
            eligibleVoters.length - Object.keys(state.appealVotes || {}).length
        );
    };

    // Modify the timer effect to handle timeout and use room-specific setting
    useEffect(() => {
        if (state.answeringPlayerId && !state.showAnswer) {
            setTimeLeft(
                state.answerTimeLimit || GAME_CONSTANTS.ANSWER_TIME_LIMIT
            );

            timerRef.current = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime <= 1) {
                        clearInterval(timerRef.current);
                        // Automatically handle timeout - the player ran out of time
                        if (state.answeringPlayerId === state.playerId) {
                            dispatch({
                                type: "TIMEOUT_ANSWER",
                            });
                        }
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);

            return () => clearInterval(timerRef.current);
        }
    }, [
        state.answeringPlayerId,
        state.showAnswer,
        state.playerId,
        dispatch,
        state.answerTimeLimit,
    ]);

    if (!currentQuestion) {
        return (
            <div className="game-screen">
                <div className="container">
                    <div className="loading">
                        載入問題中...
                        {loadingError && (
                            <div className="error-message">
                                無法載入問題。請返回房間並重試。
                                <button
                                    onClick={() => window.location.reload()}
                                >
                                    重新載入頁面
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Determine if we should show the next question button
    const showNextQuestionButton =
        state.isHost &&
        state.showAnswer &&
        !state.appealInProgress &&
        state.currentQuestionIndex < state.gameQuestions.length - 1;

    return (
        <div className="game-screen">
            <div className="container">
                <div className="game-header">
                    <h2>
                        問題 {state.currentQuestionIndex + 1}/
                        {state.gameQuestions.length}
                    </h2>
                    <div className="topic-tag">{currentQuestion.topic}</div>
                </div>
                <div className="game-layout">
                    <div className="player-rankings">
                        <h3>玩家排名</h3>
                        <div className="ranking-list">
                            {sortedPlayers.map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`ranking-item ${
                                        player.id === state.answeringPlayerId
                                            ? "answering"
                                            : ""
                                    }`}
                                >
                                    <div className="rank">{index + 1}</div>
                                    <div className="player-name">
                                        {player.name}{" "}
                                        {player.id === state.playerId
                                            ? "(你)"
                                            : ""}
                                    </div>
                                    <div className="player-score">
                                        {player.score} 分
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="question-section">
                        <div className="question-container">
                            {/* Question display */}
                            {state.showAnswer ? (
                                <div className="question-text">
                                    {currentQuestion.question}
                                </div>
                            ) : (
                                <>
                                    <TypewriterEffect
                                        text={currentQuestion.question}
                                        onInterrupt={handleAnswerQuestion}
                                    />
                                    {!state.answeringPlayerId && (
                                        <button
                                            className="answer-button"
                                            onClick={handleAnswerQuestion}
                                        >
                                            回答
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Answering interface */}
                            {state.answeringPlayerId && !state.showAnswer && (
                                <div className="answering-info">
                                    <div className="answering-player">
                                        {state.players.find(
                                            (p) =>
                                                p.id === state.answeringPlayerId
                                        )?.name || "未知玩家"}
                                        正在回答...
                                    </div>

                                    {timeLeft !== null && (
                                        <div className="timer-container">
                                            {/* Remove the timer-label div that displays seconds */}
                                            <div className="time-bar">
                                                <div
                                                    className="time-progress"
                                                    style={{
                                                        width: `${
                                                            (timeLeft /
                                                                (state.answerTimeLimit ||
                                                                    GAME_CONSTANTS.ANSWER_TIME_LIMIT)) *
                                                            100
                                                        }%`,
                                                        backgroundColor:
                                                            getTimerColor(
                                                                timeLeft
                                                            ),
                                                        transition:
                                                            "width 1s linear, background-color 1s ease-in-out",
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    {isAnswering && (
                                        <form
                                            className="answer-form"
                                            onSubmit={handleSubmitAnswer}
                                        >
                                            <input
                                                type="text"
                                                value={answer}
                                                onChange={(e) =>
                                                    setAnswer(e.target.value)
                                                }
                                                placeholder="輸入你的答案"
                                                autoFocus
                                            />
                                            <button
                                                className="btn-submit"
                                                type="submit"
                                            >
                                                提交
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}

                            {/* Answer result */}
                            {state.showAnswer && !state.appealInProgress && (
                                <div
                                    className={`answer-result ${
                                        state.answerResult
                                            ? "correct"
                                            : "incorrect"
                                    }`}
                                >
                                    <div className="answer-row">
                                        <div className="answer-label">
                                            提交答案:
                                        </div>
                                        <div className="submitted-answer">
                                            {state.submittedAnswer ||
                                                "(未回答)"}
                                        </div>
                                    </div>
                                    <div className="answer-row">
                                        <div className="answer-label">
                                            正確答案:
                                        </div>
                                        <div className="correct-answer">
                                            {state.correctAnswer}
                                        </div>
                                    </div>
                                    <div className="result-message">
                                        {state.answerResult
                                            ? "回答正確！"
                                            : "回答錯誤"}
                                    </div>

                                    {/* Appeal button */}
                                    {canAppeal && (
                                        <div className="appeal-section">
                                            <button
                                                className="btn-appeal"
                                                onClick={handleAppeal}
                                            >
                                                申訴答案
                                            </button>
                                            <div className="appeal-message">
                                                認為你的答案應該被判為正確嗎？點擊申訴按鈕。
                                            </div>
                                        </div>
                                    )}

                                    {/* Add explanation if available */}
                                    {state.answerExplanation && (
                                        <div className="answer-explanation">
                                            <div className="explanation-label">
                                                Explanation:
                                            </div>
                                            <div className="explanation-text">
                                                {state.answerExplanation}
                                            </div>
                                        </div>
                                    )}

                                    {/* NEW: Add next question button for host */}
                                    {showNextQuestionButton && (
                                        <div className="next-question-controls">
                                            <button
                                                className="btn-primary"
                                                onClick={handleNextQuestion}
                                            >
                                                下一題
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Appeal voting UI */}
                            {state.appealInProgress && (
                                <div className="appeal-voting">
                                    <div className="appeal-info">
                                        <h3>答案申訴</h3>
                                        <div className="appeal-question">
                                            {currentQuestion.question}
                                        </div>
                                        <div className="appeal-answers">
                                            <div className="appeal-row">
                                                <div className="label">
                                                    提交答案:
                                                </div>
                                                <div>
                                                    {state.appealingAnswer}
                                                </div>
                                            </div>
                                            <div className="appeal-row">
                                                <div className="label">
                                                    正確答案:
                                                </div>
                                                <div>{state.correctAnswer}</div>
                                            </div>
                                        </div>

                                        {/* Voting options for players who didn't appeal */}
                                        {state.appealPlayerId !==
                                            state.playerId &&
                                            !hasVotedOnAppeal() && (
                                                <>
                                                    <div className="appeal-prompt">
                                                        這個答案應該被判為正確嗎？
                                                    </div>
                                                    <div className="vote-buttons">
                                                        <button
                                                            className="btn-accept"
                                                            onClick={() =>
                                                                handleVoteOnAppeal(
                                                                    "accept"
                                                                )
                                                            }
                                                        >
                                                            同意
                                                        </button>
                                                        <button
                                                            className="btn-reject"
                                                            onClick={() =>
                                                                handleVoteOnAppeal(
                                                                    "reject"
                                                                )
                                                            }
                                                        >
                                                            駁回
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                        {/* Show user's vote */}
                                        {hasVotedOnAppeal() && (
                                            <div className="vote-status">
                                                你已投票:{" "}
                                                {state.appealVotes[
                                                    state.playerId
                                                ] === "accept"
                                                    ? "同意"
                                                    : "駁回"}
                                            </div>
                                        )}

                                        {/* Message for appealing player */}
                                        {state.appealPlayerId ===
                                            state.playerId && (
                                            <div className="vote-status">
                                                等待其他玩家投票...
                                            </div>
                                        )}

                                        <div className="vote-counts">
                                            <div className="vote-count accept">
                                                {getVoteCounts().accept} 同意
                                            </div>
                                            <div className="vote-count reject">
                                                {getVoteCounts().reject} 駁回
                                            </div>
                                            <div className="votes-remaining">
                                                剩餘投票: {getRemainingVotes()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Appeal results */}
                            {!state.appealInProgress &&
                                state.appealPassed !== null &&
                                state.showAnswer && (
                                    <div
                                        className={`appeal-result ${
                                            state.appealPassed
                                                ? "passed"
                                                : "failed"
                                        }`}
                                    >
                                        <div className="appeal-result-message">
                                            {state.appealPassed
                                                ? "申訴成功！答案被接受為正確。"
                                                : "申訴失敗！答案仍被視為錯誤。"}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameScreen;
