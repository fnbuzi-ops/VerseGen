import { GoogleGenerativeAI } from "@google/genai";

// Vercel handles the environment variable
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenerativeAI(apiKey);
const model = "gemini-2.5-flash"; // Supports image understanding

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, base64Image, mimeType } = request.body;
    
    if (!apiKey || !prompt || !base64Image || !mimeType) {
        return response.status(400).json({ error: 'Missing required parameters.' });
    }

    const systemPrompt = `You are VerseGen's Fortnite Coaching AI. Your models are trained by analyzing thousands of hours of professional Fortnite VODs and competitive play. 
    You are analyzing a static gameplay screenshot provided by the user, and answering their question based on the visual evidence.
    - Identify the key elements: position, loadout, crosshair placement, remaining players, zone location, and material count.
    - Provide 3-5 specific, actionable bullet points for improvement or strategic advice.
    - Focus strictly on competitive Fortnite terminology and strategy (e.g., 'piece control,' 'refresh,' 'first zone pull').
    - Do not offer generic advice. Be encouraging yet critical.`;

    try {
        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Image
            }
        };

        const responseData = await ai.models.generateContent({
            model: model,
            contents: [
                { role: "user", parts: [{ text: prompt }, imagePart] }
            ],
            config: {
                systemInstruction: systemPrompt
            }
        });

        const text = responseData.text;
        
        if (responseData.candidates?.[0]?.finishReason === 'SAFETY') {
            return response.status(400).json({ error: 'Analysis blocked due to content safety policy. Please use a different image.' });
        }

        if (!text) {
             return response.status(500).json({ error: 'AI failed to generate analysis.', details: responseData });
        }
        
        return response.status(200).json({ text });

    } catch (error) {
        console.error('Error calling Gemini Vision API:', error.message);
        return response.status(500).json({ error: 'Failed to analyze image.', details: error.message });
    }
}
