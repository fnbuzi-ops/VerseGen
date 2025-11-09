// --- Vercel Serverless Function ---
// This file MUST be placed in the /api directory.
// It will handle POST requests to /api/generate-text

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, toolType } = request.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    if (!apiKey) {
        return response.status(500).json({ error: 'API key not configured.' });
    }
    if (!prompt) {
        return response.status(400).json({ error: 'Prompt is required.' });
    }

    // --- System Prompt Engineering ---
    // This is where you "train" the AI to be your specific tool.
    let systemPrompt = "You are a helpful assistant.";

    if (toolType === 'creator') {
        systemPrompt = `You are VerseGen's Content Creator AI, a world-class expert in Fortnite YouTube content. 
        Your goal is to help players grow their channels. 
        - When asked for ideas, provide 5 viral-worthy video titles with brief descriptions.
        - When asked for a script, provide a clear outline (Hook, Intro, 3x Main Points, Call to Action).
        - Be concise, actionable, and use language that Fortnite players understand (e.g., 'W-Key', 'box fight', 'end-game').
        - Do not be overly formal. Be encouraging.`;
    } else if (toolType === 'hardware') {
        systemPrompt = `You are VerseGen's Hardware Builder AI, an expert PC builder specializing in Fortnite performance.
        - Your response MUST be a PC build list or a direct answer to the hardware question.
        - When asked for a build, format the response as a Markdown table with columns: Part, Item, and Reason/Notes.
        - Prioritize high FPS and low latency for Fortnite (e.g., strong CPU, fast RAM).
        - Always stick to the user's budget.
        - Do not suggest peripherals unless asked.`;
    }
    
    const payload = {
        contents: [{ 
            parts: [{ text: prompt }] 
        }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    try {
        // Implement exponential backoff for retries
        let res;
        let retries = 3;
        let delay = 1000;
        
        for (let i = 0; i < retries; i++) {
            res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                break; // Success
            }

            if (res.status === 429 || res.status >= 500) {
                // Throttling or server error, wait and retry
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                // Other client error, don't retry
                throw new Error(`API request failed with status ${res.status}`);
            }
        }
        
        if (!res.ok) {
            throw new Error(`API request failed after ${retries} retries.`);
        }

        const data = await res.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const text = data.candidates[0].content.parts[0].text;
            return response.status(200).json({ text });
        } else {
            return response.status(500).json({ error: 'Invalid API response structure.', details: data });
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return response.status(500).json({ error: 'Failed to generate content.', details: error.message });
    }
}