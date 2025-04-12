const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
const errorResponse = {
    isCorrect: false,
    confidence: 1.0,
    explanation: "Gemini API error",
};

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
        return jsonMatch ? JSON.parse(jsonMatch[0]) : errorResponse;
    } catch (error) {
        console.error("Error checking answer with Gemini:", error);
        return errorResponse;
    }
}

module.exports = {
    checkAnswer,
};
