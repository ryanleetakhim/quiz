import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGame } from "../context/GameContext";
import { GAME_CONSTANTS } from "../utils/constants";

const TypewriterEffect = ({ text, onInterrupt, forceStop }) => {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);
    const intervalRef = useRef(null);
    const charIndex = useRef(0);

    useEffect(() => {
        // Reset when text changes
        setDisplayedText("");
        setIsComplete(false);
        charIndex.current = 0;

        // Start typewriter effect
        intervalRef.current = setInterval(() => {
            if (charIndex.current < text.length) {
                // Use substring instead of direct character access
                setDisplayedText(text.substring(0, charIndex.current + 1));
                charIndex.current++;
            } else {
                clearInterval(intervalRef.current);
                setIsComplete(true);
            }
        }, GAME_CONSTANTS.TYPEWRITER_SPEED);

        return () => clearInterval(intervalRef.current);
    }, [text]);

    // Force stop effect when forceStop prop changes to true
    useEffect(() => {
        if (forceStop && !isComplete) {
            // Just stop the typing - don't reveal the full text
            clearInterval(intervalRef.current);
            setIsComplete(true);
        }
    }, [forceStop, isComplete]);

    const handleClick = () => {
        if (!isComplete) {
            clearInterval(intervalRef.current);
            setDisplayedText(text);
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
    const [appealVotingComplete, setAppealVotingComplete] = useState(false);

    // Consolidate timer-related state and references
    const [timers, setTimers] = useState({
        answerTimer: null,
        nextQuestionTimer: null,
        appealTimer: null,
    });

    // Consolidate timer refs into a single object
    const timerRefs = useRef({
        answerTimer: null,
        nextQuestionTimer: null,
        appealTimer: null,
        nextQuestionTimeout: null,
        appealTimeout: null,
        appealResultTimeout: null,
    });

    const currentQuestion = state.gameQuestions[state.currentQuestionIndex];

    // Find the user player with more accurate identification
    const userPlayer = state.players.find((player) => {
        // First check for the stored player ID - this is the most reliable identifier
        const currentPlayerId = localStorage.getItem("currentPlayerId");
        if (currentPlayerId && player.id === currentPlayerId) return true;

        // If no ID is stored but player is host, it means we're in host mode
        if (!currentPlayerId && player.isHost) return true;

        // Last fallback - find first non-bot player that's not the host
        if (!currentPlayerId && !player.isBot && !player.isHost) return true;

        return false;
    });

    // Sort players by score for ranking
    const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);

    // Helper functions with useCallback to avoid dependency issues

    // Function to check if all eligible players have voted - enhance it to be more reliable
    const checkAllPlayersVoted = useCallback(() => {
        if (!state.players || !state.appealPlayerId) return false;

        const eligibleVoters = state.players.filter(
            (p) => p.id !== state.appealPlayerId
        );
        const votesCount = Object.keys(state.appealVotes || {}).length;

        // Return true when all eligible voters have voted
        return votesCount >= eligibleVoters.length;
    }, [state.players, state.appealPlayerId, state.appealVotes]);

    // Calculate vote summary
    const getVoteSummary = useCallback(() => {
        const votes = Object.values(state.appealVotes || {});
        const acceptVotes = votes.filter((v) => v === "accept").length;
        const rejectVotes = votes.filter((v) => v === "reject").length;
        const abstainVotes = votes.filter((v) => v === "abstain").length;
        return { acceptVotes, rejectVotes, abstainVotes };
    }, [state.appealVotes]);

    // Clear all timers helper - can be simplified
    const clearAllTimers = useCallback(() => {
        Object.values(timerRefs.current).forEach((timer) => {
            if (timer) {
                if (typeof timer === "number") {
                    clearTimeout(timer);
                } else {
                    clearInterval(timer);
                }
            }
        });

        // Reset timer refs
        timerRefs.current = {
            answerTimer: null,
            nextQuestionTimer: null,
            appealTimer: null,
            nextQuestionTimeout: null,
            appealTimeout: null,
            appealResultTimeout: null,
        };
    }, []);

    // Start a timer for next question transition - modified to always auto-advance
    const startNextQuestionTimer = useCallback(
        (seconds, isAppealResult = false) => {
            // Clear all timers first to avoid conflicts
            clearAllTimers();

            const totalMs = seconds * 1000;
            const startTime = Date.now();
            const endTime = startTime + totalMs;

            setTimers((prevTimers) => ({
                ...prevTimers,
                nextQuestionTimer: seconds,
            }));

            // Update the timer every 50ms for smoother progress bar
            timerRefs.current.nextQuestionTimer = setInterval(() => {
                const now = Date.now();
                const remaining = Math.max(
                    0,
                    Math.floor(((endTime - now) / 1000) * 100) / 100 // Keep decimals for smoother updates
                );

                setTimers((prevTimers) => ({
                    ...prevTimers,
                    nextQuestionTimer: remaining,
                }));

                if (now >= endTime) {
                    clearInterval(timerRefs.current.nextQuestionTimer);
                    // Always auto-advance regardless of whether it's an appeal result or not
                }
            }, GAME_CONSTANTS.TIMER_UPDATE_INTERVAL); // More frequent updates

            // Always set a timeout to advance to the next question
            timerRefs.current.nextQuestionTimeout = setTimeout(() => {
                clearInterval(timerRefs.current.nextQuestionTimer);
                dispatch({ type: "NEXT_QUESTION" });
            }, totalMs);
        },
        [clearAllTimers, dispatch]
    );

    // Function to resolve appeal voting
    const resolveAppeal = useCallback(() => {
        setAppealVotingComplete(true);
        clearAllTimers();

        // First resolve appeal
        timerRefs.current.appealTimeout = setTimeout(() => {
            dispatch({ type: "RESOLVE_APPEAL" });

            // Start the appeal result display timer, after which we'll auto-advance
            startNextQuestionTimer(
                GAME_CONSTANTS.APPEAL_RESULT_DISPLAY_TIME / 1000,
                true
            );
        }, GAME_CONSTANTS.APPEAL_RESOLUTION_DELAY);
    }, [clearAllTimers, dispatch, startNextQuestionTimer]);

    // Force complete appeal voting when timer runs out
    const forceCompleteAppealVoting = useCallback(() => {
        // For any player that hasn't voted, submit a default vote
        state.players.forEach((player) => {
            if (
                !state.appealVotes[player.id] &&
                player.id !== state.appealPlayerId
            ) {
                // Submit a default vote (bots will still use their probabilities)
                if (player.isBot) {
                    const defaultVote =
                        Math.random() <
                        GAME_CONSTANTS.BOT.APPEAL_ACCEPT_PROBABILITY
                            ? "accept"
                            : "reject";

                    dispatch({
                        type: "VOTE_ON_APPEAL",
                        payload: { playerId: player.id, vote: defaultVote },
                    });
                } else if (player.id === userPlayer?.id) {
                    // For the human player, submit an abstain vote
                    dispatch({
                        type: "VOTE_ON_APPEAL",
                        payload: { playerId: player.id, vote: "abstain" },
                    });
                }
            }
        });

        // Then resolve the appeal
        resolveAppeal();
    }, [
        state.players,
        state.appealVotes,
        state.appealPlayerId,
        userPlayer,
        dispatch,
        resolveAppeal,
    ]);

    // Start a timer for appeal voting
    const startAppealTimer = useCallback(
        (seconds) => {
            // First clear all timers
            clearAllTimers();

            const totalMs = seconds * 1000;
            const startTime = Date.now();
            const endTime = startTime + totalMs;

            // Set initial value
            setTimers((prevTimers) => ({
                ...prevTimers,
                appealTimer: seconds,
            }));

            // Update the timer every 50ms for smoother progress bar
            timerRefs.current.appealTimer = setInterval(() => {
                const now = Date.now();
                const remaining = Math.max(
                    0,
                    Math.floor(((endTime - now) / 1000) * 100) / 100 // Keep decimals for smoother updates
                );

                setTimers((prevTimers) => ({
                    ...prevTimers,
                    appealTimer: remaining,
                }));

                if (now >= endTime) {
                    clearInterval(timerRefs.current.appealTimer);

                    // If time runs out and not all players voted, trigger auto-voting
                    if (!appealVotingComplete) {
                        forceCompleteAppealVoting();
                    }
                }
            }, GAME_CONSTANTS.TIMER_UPDATE_INTERVAL); // More frequent updates
        },
        [appealVotingComplete, forceCompleteAppealVoting, clearAllTimers]
    );

    // Event handler functions

    const handleAnswerInterrupt = () => {
        // User wants to answer - make sure userPlayer exists before accessing its ID
        if (!state.answeringPlayerId && !state.showAnswer && userPlayer) {
            dispatch({ type: "ANSWER_QUESTION", payload: userPlayer.id });

            // Start countdown timer for answering with smoother updates
            setTimers((prevTimers) => ({
                ...prevTimers,
                answerTimer: GAME_CONSTANTS.ANSWER_TIME_LIMIT,
            }));

            const answerStartTime = Date.now();
            const answerEndTime =
                answerStartTime + GAME_CONSTANTS.ANSWER_TIME_LIMIT * 1000;

            timerRefs.current.answerTimer = setInterval(() => {
                const now = Date.now();
                const remaining = Math.max(
                    0,
                    Math.floor(((answerEndTime - now) / 1000) * 100) / 100
                );

                setTimers((prevTimers) => {
                    if (remaining <= 0) {
                        clearInterval(timerRefs.current.answerTimer);
                        // Time's up, submit empty answer
                        dispatch({ type: "SUBMIT_ANSWER", payload: "" });

                        // Move to next question after delay
                        setTimeout(() => {
                            dispatch({ type: "NEXT_QUESTION" });
                        }, GAME_CONSTANTS.NEXT_QUESTION_DELAY);

                        return { ...prevTimers, answerTimer: 0 };
                    }
                    return { ...prevTimers, answerTimer: remaining };
                });
            }, GAME_CONSTANTS.TIMER_UPDATE_INTERVAL);
        }
    };

    const handleSubmitAnswer = (e) => {
        e.preventDefault();
        clearInterval(timerRefs.current.answerTimer);

        dispatch({ type: "SUBMIT_ANSWER", payload: answer });

        // Start next question countdown timer - explicitly not an appeal result
        startNextQuestionTimer(
            GAME_CONSTANTS.NEXT_QUESTION_DELAY / 1000,
            false
        );
    };

    const handleAppeal = () => {
        dispatch({ type: "APPEAL_ANSWER" });
        setAppealVotingComplete(false);

        // Cancel any pending next question timer
        clearAllTimers();

        // Start appeal voting timer
        startAppealTimer(GAME_CONSTANTS.APPEAL_VOTING_TIME / 1000);
    };

    const handleVoteOnAppeal = (vote) => {
        if (userPlayer) {
            dispatch({
                type: "VOTE_ON_APPEAL",
                payload: { playerId: userPlayer.id, vote },
            });

            // We don't need a timeout here anymore - the effect above will handle resolution
            // The effect will detect when all votes are in and automatically resolve
        }
    };

    // Clean up all timers when component unmounts or question changes
    useEffect(() => {
        setAnswer("");
        setTimers({
            answerTimer: null,
            nextQuestionTimer: null,
            appealTimer: null,
        });
        setAppealVotingComplete(false);

        clearAllTimers();

        return clearAllTimers;
    }, [state.currentQuestionIndex, clearAllTimers]);

    // Modify the appeal voting effect to watch for all votes being cast
    useEffect(() => {
        // If appeal is in progress, check if all votes are in
        if (
            state.appealInProgress &&
            checkAllPlayersVoted() &&
            !appealVotingComplete
        ) {
            // All votes are in - resolve the appeal immediately
            resolveAppeal();
        }
    }, [
        state.appealInProgress,
        state.appealVotes,
        checkAllPlayersVoted,
        appealVotingComplete,
        resolveAppeal,
    ]);

    if (!currentQuestion) return <div className="loading">Loading...</div>;

    return (
        <div className="game-screen">
            <div className="container">
                <div className="game-header">
                    <h2>
                        問題 {state.currentQuestionIndex + 1}/
                        {state.gameQuestions.length}
                    </h2>
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
                                        {player.name}
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
                            {state.showAnswer ? (
                                <div className="question-text">
                                    {currentQuestion.question}
                                </div>
                            ) : (
                                <TypewriterEffect
                                    text={currentQuestion.question}
                                    onInterrupt={handleAnswerInterrupt}
                                    forceStop={state.answeringPlayerId !== null}
                                />
                            )}

                            {!state.answeringPlayerId && !state.showAnswer && (
                                <button
                                    className="answer-button"
                                    onClick={handleAnswerInterrupt}
                                >
                                    回答
                                </button>
                            )}

                            {state.answeringPlayerId && !state.showAnswer && (
                                <div className="answering-info">
                                    <div className="answering-player">
                                        {
                                            state.players.find(
                                                (p) =>
                                                    p.id ===
                                                    state.answeringPlayerId
                                            )?.name
                                        }{" "}
                                        正在回答...
                                    </div>

                                    {timers.answerTimer !== null && (
                                        <div className="timer-container">
                                            <div
                                                className="time-bar"
                                                style={{
                                                    width: `${
                                                        (timers.answerTimer /
                                                            GAME_CONSTANTS.ANSWER_TIME_LIMIT) *
                                                        GAME_CONSTANTS.PERCENTAGE_BASE
                                                    }%`,
                                                    backgroundColor:
                                                        timers.answerTimer <=
                                                        GAME_CONSTANTS.TIMER_RED_THRESHOLD
                                                            ? GAME_CONSTANTS
                                                                  .TIMER_COLOR
                                                                  .DANGER
                                                            : timers.answerTimer <=
                                                              GAME_CONSTANTS.TIMER_YELLOW_THRESHOLD
                                                            ? GAME_CONSTANTS
                                                                  .TIMER_COLOR
                                                                  .WARNING
                                                            : GAME_CONSTANTS
                                                                  .TIMER_COLOR
                                                                  .GOOD,
                                                    transition: `width ${GAME_CONSTANTS.TRANSITION_SPEED} linear`,
                                                }}
                                            ></div>
                                        </div>
                                    )}

                                    {state.answeringPlayerId ===
                                        userPlayer?.id && (
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
                                                type="submit"
                                                className="btn-submit"
                                            >
                                                提交
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}

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
                                        <div className="answer-value">
                                            {state.submittedAnswer ||
                                                "(無答案)"}
                                        </div>
                                    </div>
                                    <div className="answer-row">
                                        <div className="answer-label">
                                            正確答案:
                                        </div>
                                        <div className="answer-value">
                                            {state.correctAnswer}
                                        </div>
                                    </div>
                                    <div className="result-message">
                                        {state.answerResult
                                            ? "答對了！"
                                            : "答錯了！"}
                                    </div>

                                    {/* Next question timer */}
                                    {timers.nextQuestionTimer !== null && (
                                        <div className="timer-container next-question-timer">
                                            <div className="timer-label">
                                                下一題 (
                                                {timers.nextQuestionTimer}秒)
                                            </div>
                                            <div
                                                className="time-bar"
                                                style={{
                                                    width: `${
                                                        (timers.nextQuestionTimer /
                                                            (GAME_CONSTANTS.NEXT_QUESTION_DELAY /
                                                                1000)) *
                                                        GAME_CONSTANTS.PERCENTAGE_BASE
                                                    }%`,
                                                    backgroundColor:
                                                        GAME_CONSTANTS
                                                            .TIMER_COLOR.GOOD,
                                                    transition: `width ${GAME_CONSTANTS.TRANSITION_SPEED} linear`,
                                                }}
                                            ></div>
                                        </div>
                                    )}

                                    {/* Appeal button - only show if not appealed yet, player answered, and answer was wrong */}
                                    {!state.answerResult &&
                                        state.answeringPlayerId ===
                                            userPlayer?.id &&
                                        !state.hasBeenAppealed && (
                                            <div className="appeal-section">
                                                <button
                                                    className="btn-appeal"
                                                    onClick={handleAppeal}
                                                >
                                                    申訴答案
                                                </button>
                                                <div className="appeal-message">
                                                    你的答案可能是對的？點擊申訴讓其他玩家投票決定！
                                                </div>
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
                                            問題: {currentQuestion.question}
                                        </div>
                                        <div className="appeal-answers">
                                            <div className="appeal-row">
                                                <span className="label">
                                                    正確答案:
                                                </span>
                                                <span className="value">
                                                    {state.correctAnswer}
                                                </span>
                                            </div>
                                            <div className="appeal-row">
                                                <span className="label">
                                                    玩家答案:
                                                </span>
                                                <span className="value">
                                                    {state.appealingAnswer}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="appeal-prompt">
                                            {state.appealPlayerId ===
                                            userPlayer?.id
                                                ? "其他玩家正在對你的答案進行投票..."
                                                : "這個答案應該被視為正確嗎？"}
                                        </div>
                                    </div>

                                    {/* Voting buttons - only show to other players who haven't voted yet */}
                                    {state.appealPlayerId !== userPlayer?.id &&
                                        !state.appealVotes[userPlayer?.id] && (
                                            <div className="vote-buttons">
                                                <button
                                                    className="btn-accept"
                                                    onClick={() =>
                                                        handleVoteOnAppeal(
                                                            "accept"
                                                        )
                                                    }
                                                >
                                                    同意答案
                                                </button>
                                                <button
                                                    className="btn-reject"
                                                    onClick={() =>
                                                        handleVoteOnAppeal(
                                                            "reject"
                                                        )
                                                    }
                                                >
                                                    拒絕答案
                                                </button>
                                            </div>
                                        )}

                                    {/* Only show timer if not all players have voted yet */}
                                    {timers.appealTimer !== null &&
                                        !appealVotingComplete &&
                                        !checkAllPlayersVoted() && (
                                            <div className="timer-container appeal-timer">
                                                <div className="timer-label">
                                                    投票時間 (
                                                    {timers.appealTimer}秒)
                                                </div>
                                                <div
                                                    className="time-bar"
                                                    style={{
                                                        width: `${
                                                            (timers.appealTimer /
                                                                (GAME_CONSTANTS.APPEAL_VOTING_TIME /
                                                                    1000)) *
                                                            GAME_CONSTANTS.PERCENTAGE_BASE
                                                        }%`,
                                                        backgroundColor:
                                                            timers.appealTimer <=
                                                            GAME_CONSTANTS.TIMER_DANGER_THRESHOLD
                                                                ? GAME_CONSTANTS
                                                                      .TIMER_COLOR
                                                                      .DANGER
                                                                : GAME_CONSTANTS
                                                                      .TIMER_COLOR
                                                                      .APPEAL,
                                                        transition: `width ${GAME_CONSTANTS.TRANSITION_SPEED} linear`,
                                                    }}
                                                ></div>
                                            </div>
                                        )}

                                    {/* Show a message when all votes are in but still processing */}
                                    {checkAllPlayersVoted() &&
                                        !appealVotingComplete && (
                                            <div className="processing-votes">
                                                處理投票結果...
                                            </div>
                                        )}

                                    {/* Show votes as they come in */}
                                    <div className="vote-status">
                                        <div className="vote-counts">
                                            <div className="vote-count accept">
                                                同意:{" "}
                                                {getVoteSummary().acceptVotes}
                                            </div>
                                            <div className="vote-count reject">
                                                拒絕:{" "}
                                                {getVoteSummary().rejectVotes}
                                            </div>
                                            {getVoteSummary().abstainVotes >
                                                0 && (
                                                <div className="vote-count abstain">
                                                    棄權:{" "}
                                                    {
                                                        getVoteSummary()
                                                            .abstainVotes
                                                    }
                                                </div>
                                            )}
                                        </div>
                                        <div className="votes-remaining">
                                            剩餘投票:{" "}
                                            {state.players.filter(
                                                (p) =>
                                                    p.id !==
                                                    state.appealPlayerId
                                            ).length -
                                                Object.keys(state.appealVotes)
                                                    .length}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Appeal results - remove the next question button AND time bar */}
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

                                        {/* Simple text showing time remaining without visual bar */}
                                        {timers.nextQuestionTimer !== null && (
                                            <div className="next-question-text">
                                                {timers.nextQuestionTimer}
                                                秒後進入下一題...
                                            </div>
                                        )}
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
