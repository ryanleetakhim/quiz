import Papa from "papaparse";
import { useState, useEffect } from "react";

// Fallback to CSV if Firebase fails
const loadQuestionsFromCSV = async () => {
    try {
        const response = await fetch("/questions.csv");
        const csvText = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.warn("CSV parsing had errors:", results.errors);
                    }
                    resolve(results.data);
                },
                error: (error) => {
                    console.error("Error parsing CSV:", error);
                    reject(error);
                },
            });
        });
    } catch (error) {
        console.error("Error fetching CSV:", error);
        throw error;
    }
};

const loadQuestionsFromGoogleSheets = async () => {
    try {
        const API_KEY = "AIzaSyAQT1uNmJrDYSwgWAMk1NMou0XuSpvrncA";
        const SPREADSHEET_ID = "1BcJDKw7gB6uYS0967lcObwAbCCs1Qr5LHghxl0_HFVc";
        const RANGE = "questions!A2:F";

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const rows = data.values;

        if (!rows || rows.length === 0) {
            throw new Error("No data found in spreadsheet");
        }

        return rows.map((row) => ({
            question: row[0],
            answer: row[1],
            difficulty: row[2] || "5.0",
            topic: row[3],
            subtopic: row[4] || "",
        }));
    } catch (error) {
        console.error("Error fetching questions from Google Sheets:", error);
        throw error;
    }
};

// Process the data from database into our application format
const processQuestionData = async () => {
    try {
        // Try to load from Google Sheets first
        let rawQuestions;
        try {
            rawQuestions = await loadQuestionsFromGoogleSheets();
            console.log("Successfully loaded questions from Google Sheets");
        } catch (sheetsError) {
            console.warn(
                "Failed to load from Google Sheets, falling back to CSV",
                sheetsError
            );
            rawQuestions = await loadQuestionsFromCSV();
        }

        // Rest of the function remains the same
        // Extract unique topics
        const uniqueTopics = [...new Set(rawQuestions.map((q) => q.topic))];

        // Format topics for UI
        const extractedTopics = uniqueTopics.map((topic) => ({
            id: topic,
            name: topic,
        }));

        // Group questions by topic
        const extractedQuestionData = {};
        uniqueTopics.forEach((topic) => {
            extractedQuestionData[topic] = rawQuestions
                .filter((q) => q.topic === topic)
                .map((q) => ({
                    question: q.question,
                    answer: q.answer,
                    difficulty: q.difficulty || "medium",
                    subtopic: q.subtopic || "", // Add subtopic field
                }));
        });

        return {
            topics: extractedTopics,
            questionData: extractedQuestionData,
        };
    } catch (error) {
        console.error("Error processing question data:", error);
        return { topics: [], questionData: {} };
    }
};

// State to track if data is ready
let dataLoaded = false;
let loadedData = { topics: [], questionData: {} };

// Load data immediately
(async () => {
    try {
        loadedData = await processQuestionData();
        dataLoaded = true;
        console.log(`Loaded ${loadedData.topics.length} topics`);
    } catch (error) {
        console.error("Failed to initialize question data:", error);
    }
})();

// Hook for React components - now properly handles loading state
export const useQuestionData = () => {
    const [data, setData] = useState({
        topics: [],
        questionData: {},
        loading: true,
    });

    useEffect(() => {
        // If data is already loaded, update state immediately
        if (dataLoaded) {
            setData({ ...loadedData, loading: false });
            return;
        }

        // Otherwise, set up a poller to check for data
        const checkDataLoaded = setInterval(() => {
            if (dataLoaded) {
                setData({ ...loadedData, loading: false });
                clearInterval(checkDataLoaded);
            }
        }, 100);

        return () => clearInterval(checkDataLoaded);
    }, []);

    return data;
};

// Generate questions function with better error handling
export const generateQuestions = (
    selectedTopics,
    count,
    difficultyRange = { min: 1, max: 10 }
) => {
    if (!selectedTopics || selectedTopics.length === 0) {
        console.error("No topics selected for question generation");
        return [];
    }

    // Check if data is loaded
    if (!dataLoaded) {
        console.error(
            "Question data not loaded yet! Please try again in a moment."
        );
        return [];
    }

    const allQuestions = [];

    // Collect questions from selected topics
    selectedTopics.forEach((topicId) => {
        if (loadedData.questionData[topicId]) {
            // Filter by difficulty range if specified
            const topicQuestions = loadedData.questionData[topicId].filter(
                (q) => {
                    const difficulty = parseFloat(q.difficulty || 5);
                    return (
                        difficulty >= difficultyRange.min &&
                        difficulty <= difficultyRange.max
                    );
                }
            );

            allQuestions.push(
                ...topicQuestions.map((q) => ({ ...q, topic: topicId }))
            );
        } else {
            console.warn(`Topic ${topicId} not found in question data`);
        }
    });

    if (allQuestions.length === 0) {
        console.error("No questions found for the selected topics");
        return [];
    }

    console.log(`Generated ${allQuestions.length} questions before shuffling`);

    // Fisher-Yates (Knuth) shuffle algorithm for true randomness
    const shuffle = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Apply proper shuffling algorithm
    const shuffled = shuffle(allQuestions);

    // Return requested number of questions (or all if fewer available)
    const result = shuffled.slice(0, count);
    console.log(`Returning ${result.length} questions after slicing`);
    return result;
};
