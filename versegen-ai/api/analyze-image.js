// --- Vercel Serverless Function ---
// This file MUST be placed in the /api directory.
// It will handle POST requests to /api/analyze-image

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, base64Image, mimeType } = request.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Use gemini-2.5-flash-preview-09-2025 as it supports image/video understanding
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    if (!apiKey) {
        return response.status(500).json({ error: 'API key not configured.' });
    }
    if (!prompt || !base64Image || !mimeType) {
        return response.status(400).json({ error: 'Prompt, base64Image, and mimeType are required.' });
    }

    const systemPrompt = `You are VerseGen's elite Fortnite Coaching AI. You are analyzing a static screenshot from a player's VOD or clip.
    - Be direct, professional, and tactical.
    - Start by identifying what's happening in the image (e.g., "I see you're in a box fight," "This looks like an end-game rotation").
    - Analyze the user's position, loadout, crosshair placement, and visible UI (health, mats).
    - Provide 3-5 scannable, actionable bullet points for improvement based *only* on the image and the user's question.
    - Do not give generic advice. Be specific to the image.
    - If the image is unclear, state that.
    - Conclude with one positive, encouraging sentence.`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { 
                        text: prompt 
                    },
                    {
                        inlineData: {
                            mimeType: mimeType, // e.g., "image/jpeg"
                            data: base64Image
                        }
                    }
                ]
            }
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    try {
        let res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorBody = await res.json();
            console.error('API Error Response:', errorBody);
            throw new Error(`API request failed with status ${res.status}: ${errorBody.error?.message || 'Unknown error'}`);
        }

        const data = await res.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const text = data.candidates[0].content.parts[0].text;
            return response.status(200).json({ text });
        } else {
             // Handle cases where the model might refuse to answer
            if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
                return response.status(400).json({ error: 'Analysis blocked by safety filters. Try a different image or prompt.' });
            }
            return response.status(500).json({ error: 'Invalid API response structure.', details: data });
        }
    } catch (error) {
        console.error('Error calling Gemini Vision API:', error);
        return response.status(500).json({ error: 'Failed to analyze image.', details: error.message });
    }
}