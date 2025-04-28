import React, { useState, useEffect } from "react";
import { db } from "../config/firebase";
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
} from "firebase/firestore";
import Papa from "papaparse";

const AdminScreen = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState({
        question: "",
        answer: "",
        topic: "",
        subtopic: "",
        difficulty: "5.0",
    });

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "questions"));
            const questionsList = [];
            querySnapshot.forEach((doc) => {
                questionsList.push({ id: doc.id, ...doc.data() });
            });
            setQuestions(questionsList);
        } catch (error) {
            console.error("Error fetching questions:", error);
        }
        setLoading(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewQuestion((prev) => ({ ...prev, [name]: value }));
    };

    const addQuestion = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "questions"), newQuestion);
            setNewQuestion({
                question: "",
                answer: "",
                topic: "",
                subtopic: "",
                difficulty: "5.0",
            });
            fetchQuestions();
        } catch (error) {
            console.error("Error adding question:", error);
        }
    };

    const importFromCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvData = event.target.result;
            const results = Papa.parse(csvData, { header: true });

            if (results.data && results.data.length > 0) {
                setLoading(true);
                try {
                    // Add each question to Firestore
                    for (const row of results.data) {
                        if (row.question && row.answer && row.topic) {
                            await addDoc(collection(db, "questions"), {
                                question: row.question,
                                answer: row.answer,
                                topic: row.topic,
                                subtopic: row.subtopic || "",
                                difficulty: row.difficulty || "5.0",
                            });
                        }
                    }
                    alert(`Imported ${results.data.length} questions`);
                    fetchQuestions();
                } catch (error) {
                    console.error("Error importing questions:", error);
                    alert("Error importing questions");
                }
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="container mt-4">
            <h1>Question Admin</h1>

            <div className="mb-4">
                <h3>Import Questions</h3>
                <input
                    type="file"
                    accept=".csv"
                    onChange={importFromCSV}
                    className="form-control"
                />
            </div>

            <div className="mb-4">
                <h3>Add New Question</h3>
                <form onSubmit={addQuestion}>
                    <div className="mb-3">
                        <label>Question</label>
                        <textarea
                            name="question"
                            value={newQuestion.question}
                            onChange={handleInputChange}
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label>Answer</label>
                        <textarea
                            name="answer"
                            value={newQuestion.answer}
                            onChange={handleInputChange}
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label>Topic</label>
                        <input
                            type="text"
                            name="topic"
                            value={newQuestion.topic}
                            onChange={handleInputChange}
                            className="form-control"
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label>Subtopic</label>
                        <input
                            type="text"
                            name="subtopic"
                            value={newQuestion.subtopic}
                            onChange={handleInputChange}
                            className="form-control"
                        />
                    </div>
                    <div className="mb-3">
                        <label>Difficulty (1-10)</label>
                        <input
                            type="number"
                            name="difficulty"
                            value={newQuestion.difficulty}
                            onChange={handleInputChange}
                            className="form-control"
                            min="1"
                            max="10"
                            step="0.1"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary">
                        Add Question
                    </button>
                </form>
            </div>

            <div>
                <h3>Questions ({questions.length})</h3>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>Topic</th>
                                <th>Question</th>
                                <th>Answer</th>
                                <th>Difficulty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map((q) => (
                                <tr key={q.id}>
                                    <td>{q.topic}</td>
                                    <td>{q.question}</td>
                                    <td>{q.answer}</td>
                                    <td>{q.difficulty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminScreen;
