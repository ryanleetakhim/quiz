import rawQuestions from "./questionsData";

// Initialize with data from our embedded questions
const processInitialData = () => {
    try {
        // Extract unique topics from the raw questions
        const uniqueTopics = [...new Set(rawQuestions.map((q) => q.topic))];

        // Create topics array
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
                    difficulty: q.difficulty,
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

const loadedData = processInitialData();

// Simplified hook - no need for useState or loading states since data is embedded
export const useQuestionData = () => {
    return { ...loadedData, loading: false };
};

// Export the topics and questionData for immediate access
export const { topics, questionData } = loadedData;

// Enhanced function to generate questions with better error handling
export const generateQuestions = (
    selectedTopics,
    count,
    difficultyFilter = null
) => {
    if (!selectedTopics || selectedTopics.length === 0) {
        console.error("No topics selected for question generation");
        return [];
    }

    const allQuestions = [];

    // Collect questions from selected topics
    selectedTopics.forEach((topicId) => {
        if (questionData[topicId]) {
            // Filter by difficulty if specified
            const topicQuestions = difficultyFilter
                ? questionData[topicId].filter(
                      (q) => q.difficulty === difficultyFilter
                  )
                : questionData[topicId];

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

    // Shuffle questions
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());

    // Return requested number of questions (or all if fewer available)
    const result = shuffled.slice(0, count);
    console.log(`Returning ${result.length} questions after slicing`);
    return result;
};
