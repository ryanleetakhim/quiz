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

// Enhanced function to generate questions with optional difficulty filter
export const generateQuestions = (
    selectedTopics,
    count,
    difficultyFilter = null
) => {
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
        }
    });

    // Shuffle questions
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());

    // Return requested number of questions (or all if fewer available)
    return shuffled.slice(0, count);
};
