const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

/**
 * Check if an answer is semantically correct using Gemini API
 * @param {string} userAnswer - The answer provided by the user
 * @param {string} correctAnswer - The official correct answer
 * @param {string} question - The question being answered (for context)
 * @returns {Promise<{isCorrect: boolean, confidence: number, explanation: string}>}
 */
async function checkAnswer(userAnswer, correctAnswer, question) {
    try {
        const prompt = `
    Question: ${question}
    Correct answer: ${correctAnswer}
    User answer: "${userAnswer}"
    
    Is the user's answer semantically equivalent to the correct answer? Consider spelling variations, 
    synonyms, different wordings with the same meaning, etc. Note that the user sometimes may give empty string as answer, please treat it as incorrect.
    Respond only with a JSON object in this format:
    {
      "isCorrect": true or false,
      "confidence": number between 0 and 1,
      "explanation": "brief explanation of your reasoning in traditional chinese"
    }
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse the JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            // Fallback to exact match if parsing fails
            return {
                isCorrect:
                    userAnswer.toLowerCase().trim() ===
                    correctAnswer.toLowerCase().trim(),
                confidence: 1.0,
                explanation:
                    "Fallback to exact string matching due to API parsing issue",
            };
        }
    } catch (error) {
        console.error("Error checking answer with Gemini:", error);

        // Fallback to exact match in case of API failure
        return {
            isCorrect:
                userAnswer.toLowerCase().trim() ===
                correctAnswer.toLowerCase().trim(),
            confidence: 1.0,
            explanation: "Fallback to exact string matching due to API error",
        };
    }
}

module.exports = {
    checkAnswer,
};
