// --- Vercel Serverless Function ---
// This file MUST be placed in the /api directory.
// It will handle POST requests to /api/generate-image

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt } = request.body;
    const apiKey = process.env.GEMINI_API_KEY; // Use the same API key
    
    // Using Imagen 3 via the Gemini API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    if (!apiKey) {
        return response.status(500).json({ error: 'API key not configured.' });
    }
    if (!prompt) {
        return response.status(400).json({ error: 'Prompt is required.' });
    }
    
    // Add context to the user's prompt
    const enhancedPrompt = `
        A YouTube thumbnail or profile picture for a Fortnite gamer. 
        Style: Modern, clean, vibrant, eye-catching. Use blues and whites as primary colors.
        User prompt: "${prompt}"
    `;

    const payload = {
        instances: {
            prompt: enhancedPrompt
        },
        parameters: {
            sampleCount: 1, // Generate one image
            aspectRatio: "1:1" // 1:1 for PFP, 16:9 for thumbnail. 1:1 is safer.
        }
    };

    try {
        let res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`API request failed with status ${res.status}: ${errorBody}`);
        }

        const data = await res.json();
        
        if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
            const base64Data = data.predictions[0].bytesBase64Encoded;
            return response.status(200).json({ base64Data });
        } else {
            return response.status(500).json({ error: 'Invalid API response from image generator.', details: data });
        }
    } catch (error) {
        console.error('Error calling Imagen API:', error);
        return response.status(500).json({ error: 'Failed to generate image.', details: error.message });
    }
}