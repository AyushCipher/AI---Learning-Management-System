import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import Course from "../models/courseModel.js";
dotenv.config();

export const searchWithAi = async (req,res) => {

  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // case-insensitive
    const ai = new GoogleGenAI({});
    const prompt = `
You are an AI assistant for an LMS platform.

A user will ask what they want to learn. Your job is to understand the intent and return exactly ONE keyword from the list below.

Valid keywords (choose only one):

App Development
AI/ML
AI Tools
Data Science
Data Analytics
Ethical Hacking
UI UX Designing
Web Development
Others
Beginner
Intermediate
Advanced

IMPORTANT RULES:
- Return ONLY one keyword exactly as listed above.
- No sentences, no explanation, no punctuation.
- Do NOT modify the keyword.
- If unsure, return "Others".

User query: "${input}"
`;


    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });


    const keyword = response.text

    const courses = await Course.find({
      isPublished: true,
      $or: [
        { title: { $regex: input, $options: 'i' } },
        { subTitle: { $regex: input, $options: 'i' } },
        { description: { $regex: input, $options: 'i' } },
        { category: { $regex: input, $options: 'i' } },
        { level: { $regex: input, $options: 'i' } }
      ]
    });

    if(courses.length > 0) {
      return res.status(200).json(courses);
    } else {
      const courses = await Course.find({
      isPublished: true,
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { subTitle: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { category: { $regex: keyword, $options: 'i' } },
        { level: { $regex: keyword, $options: 'i' } }
      ]
    });
      return res.status(200).json(courses);
    }

    } catch (error) {
      console.log(error)
    }
}