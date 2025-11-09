import { GoogleGenerativeAI } from "@google/genai";

// Vercel handles the environment variable
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenerativeAI(apiKey);
const model = "gemini-2.5-flash";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, toolType } = request.body;
    
    if (!apiKey) {
        return response.status(500).json({ error: 'API key not configured.' });
    }
    if (!prompt) {
        return response.status(400).json({ error: 'Prompt is required.' });
    }

    // --- System Prompt Engineering for Specialized Tools ---
    let systemPrompt = "You are a helpful and concise assistant.";

    if (toolType === 'creator') {
        systemPrompt = `You are VerseGen's Content Creator AI, a world-class expert in Fortnite YouTube content, branding, and scripting. 
        Your goal is to provide concise, actionable, and viral-worthy ideas for titles, descriptions, scripts, or channel branding.
        Format your response clearly using markdown headings or lists. Focus on Fortnite strategy, meta, and trends.`;
    } else if (toolType === 'hardware') {
        // Hardware Builder AI logic
        systemPrompt = `You are VerseGen's Advanced Hardware Builder AI, an expert PC builder specializing exclusively in maximizing Fortnite FPS and minimizing latency.
        - Your response MUST be a detailed PC build list or a direct, expert answer to the hardware question.
        - When suggesting a build, format the response as a clear Markdown table with columns: **Part**, **Item**, **Price Estimate (USD)**, and **Fortnite FPS Rationale**.
        - Prioritize CPU and high-speed RAM for Fortnite performance. Always stick to the user's stated budget.`;
    } else if (toolType === 'calendar') {
        // Elite Content Calendar AI logic
        systemPrompt = `You are VerseGen's Elite Content Calendar Generation AI, specializing in planning viral Fortnite content streams for YouTube and social platforms.
        - Generate a structured content calendar (e.g., 7 days or 30 days) based on the user's prompt.
        - Format the output as a Markdown table or list with clear structure (e.g., Day 1: Topic, Video Type, Goal).
        - Focus on strategy, trending topics, and growth hooks.`;
    }

    try {
        const responseData = await ai.models.generateContent({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                systemInstruction: systemPrompt
            }
        });

        const text = responseData.text;
        if (!text) {
             return response.status(500).json({ error: 'AI failed to generate a response.', details: responseData });
        }
        
        return response.status(200).json({ text });

    } catch (error) {
        console.error('Error calling Gemini API:', error.message);
        return response.status(500).json({ error: 'Failed to communicate with AI service.', details: error.message });
    }
}
