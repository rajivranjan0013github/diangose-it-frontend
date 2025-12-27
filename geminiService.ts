
import { GoogleGenAI } from "@google/genai";
import { AnalyticsSummary } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIInsights = async (summary: AnalyticsSummary) => {
  const prompt = `
    Analyze this medical simulation app's dashboard data:
    - Total Users: ${summary.totalUsers}
    - Today's Solved Cases: ${summary.todaySolvedCases}
    - Premium Users: ${summary.premiumUsers}
    - Conversion Rate: ${summary.conversionRate}%
    - Recent Join Trend: Last 14 days join data available.
    
    Provide a professional analysis in 3 bullet points:
    1. Analysis of user acquisition velocity based on the current totals.
    2. Engagement health specifically looking at today's solved cases vs total users.
    3. Monetization strategy for converting the remaining free users to premium.
    Keep it concise and actionable.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to load AI insights at this time.";
  }
};
