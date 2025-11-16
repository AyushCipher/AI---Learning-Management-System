import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import Course from "../models/courseModel.js";

dotenv.config();

export const searchWithAi = async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // ✅ Initialize Gemini AI
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
You are an intelligent assistant for an LMS platform. 
A user will type any query about what they want to learn.

Your task is to understand the intent and return ONE most relevant keyword 
from the following list ONLY:

- App Development
- AI/ML
- AI Tools
- Data Science
- Data Analytics
- Ethical Hacking
- UI UX Designing
- Web Development
- Others
- Beginner
- Intermediate
- Advanced

Rules:
- Return ONLY ONE keyword
- No explanation
- No extra words

Query: ${input}
`;

    // ✅ Generate AI response
    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: prompt }],
    });

    // ✅ Extract keyword safely
    let keyword =
      aiResponse?.response?.text?.trim() ||
      aiResponse?.text?.trim() ||
      "Others";

    // ---------------------------------------------
    // 1️⃣ FIRST SEARCH → Direct user input
    // ---------------------------------------------
    let courses = await Course.find({
      isPublished: true,
      $or: [
        { title: { $regex: input, $options: "i" } },
        { subTitle: { $regex: input, $options: "i" } },
        { description: { $regex: input, $options: "i" } },
        { category: { $regex: input, $options: "i" } },
        { level: { $regex: input, $options: "i" } },
      ],
    });

    if (courses.length > 0) {
      return res.status(200).json(courses);
    }

    // ---------------------------------------------
    // 2️⃣ SECOND SEARCH → AI keyword fallback
    // ---------------------------------------------
    courses = await Course.find({
      isPublished: true,
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { subTitle: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { category: { $regex: keyword, $options: "i" } },
        { level: { $regex: keyword, $options: "i" } },
      ],
    });

    return res.status(200).json(courses);
  } catch (error) {
    console.error("Search AI Error:", error);
    return res.status(500).json({
      message: "AI Search Error",
      error: error.message,
    });
  }
};
