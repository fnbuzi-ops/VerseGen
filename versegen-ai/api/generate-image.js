import { GoogleGenerativeAI } from "@google/genai";

// Vercel handles the environment variable
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenerativeAI(apiKey);
const IMAGEN_MODEL = "imagen-3.0-generate-002"; // Use the specific model identifier

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt } = request.body;
    
    if (!apiKey) {
        return response.status(500).json({ error: 'API key not configured.' });
    }
    if (!prompt) {
        return response.status(400).json({ error: 'Prompt is required.' });
    }
    
    // Enhance prompt for Fortnite/Branding context
    const enhancedPrompt = `A high-quality, professional ${prompt.toLowerCase().includes('pfp') || prompt.toLowerCase().includes('profile') ? 'profile picture' : 'YouTube thumbnail'} for a competitive Fortnite player. Style is modern, dark blue and light blue color palette, with white accents and neon glow.`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: {
                    prompt: enhancedPrompt
                },
                parameters: {
                    sampleCount: 1,
                    aspectRatio: prompt.toLowerCase().includes('thumbnail') ? "16:9" : "1:1" 
                }
            }),
        });

        if (!res.ok) {
            const errorBody = await res.json();
            console.error('Imagen API Error:', errorBody);
            throw new Error(errorBody.error?.message || `API request failed with status ${res.status}`);
        }

        const data = await res.json();
        
        if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
            const base64Data = data.predictions[0].bytesBase64Encoded;
            return response.status(200).json({ base64Data });
        } else {
            return response.status(500).json({ error: 'Image generation failed to return data.' });
        }
    } catch (error) {
        console.error('Error calling Imagen API:', error);
        return response.status(500).json({ error: 'Failed to generate image.', details: error.message });
    }
}
