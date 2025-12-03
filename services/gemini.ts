/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Using gemini-2.5-pro for complex coding tasks.
const GEMINI_MODEL = 'gemini-2.0-flash'; // 2.0 Flash is faster and free-tier friendly, but users can change logic if they want Pro

const SYSTEM_INSTRUCTION = `You are an expert AI Engineer and Product Designer specializing in "bringing artifacts to life".
Your goal is to take a user uploaded file—which might be a polished UI design, a messy napkin sketch, a photo of a whiteboard with jumbled notes, or a picture of a real-world object (like a messy desk)—and instantly generate a fully functional, interactive, single-page HTML/JS/CSS application.

CORE DIRECTIVES:
1. **Analyze & Abstract**: Look at the image.
    - **Sketches/Wireframes**: Detect buttons, inputs, and layout. Turn them into a modern, clean UI.
    - **Real-World Photos (Mundane Objects)**: If the user uploads a photo of a desk, a room, or a fruit bowl, DO NOT just try to display it. **Gamify it** or build a **Utility** around it.
      - *Cluttered Desk* -> Create a "Clean Up" game where clicking items (represented by emojis or SVG shapes) clears them, or a Trello-style board.
      - *Fruit Bowl* -> A nutrition tracker or a still-life painting app.
    - **Documents/Forms**: specific interactive wizards or dashboards.

2. **NO EXTERNAL IMAGES**:
    - **CRITICAL**: Do NOT use <img src="..."> with external URLs (like imgur, placeholder.com, or generic internet URLs). They will fail.
    - **INSTEAD**: Use **CSS shapes**, **inline SVGs**, **Emojis**, or **CSS gradients** to visually represent the elements you see in the input.
    - If you see a "coffee cup" in the input, render a ☕ emoji or draw a cup with CSS. Do not try to load a jpg of a coffee cup.

3. **Make it Interactive**: The output MUST NOT be static. It needs buttons, sliders, drag-and-drop, or dynamic visualizations.
4. **Self-Contained**: The output must be a single HTML file with embedded CSS (<style>) and JavaScript (<script>). No external dependencies unless absolutely necessary (Tailwind via CDN is allowed).
5. **Robust & Creative**: If the input is messy or ambiguous, generate a "best guess" creative interpretation. Never return an error. Build *something* fun and functional.
6. **Language**: The text content within the generated application MUST be in Simplified Chinese (简体中文).

RESPONSE FORMAT:
Return ONLY the raw HTML code. Do not wrap it in markdown code blocks (\`\`\`html ... \`\`\`). Start immediately with <!DOCTYPE html>.`;

const UPDATE_SYSTEM_INSTRUCTION = `You are an expert AI Engineer.
Your goal is to modify an existing single-page HTML application based on the user's request.

INPUT:
1. The current HTML code.
2. A user request describing the desired changes.

DIRECTIVES:
1. Return the FULL updated HTML code. Do not return partial diffs.
2. Maintain the existing functionality unless asked to change it.
3. Keep the single-file format (HTML + CSS + JS).
4. Ensure the text remains in Simplified Chinese (简体中文) if not specified otherwise.
5. If the user asks to "fix" something, analyze the code and fix the logic.
6. **NO EXTERNAL IMAGES**: Do NOT add <img src="..."> with external URLs. Use CSS, SVGs, or Emojis.

RESPONSE FORMAT:
Return ONLY the raw HTML code. Start immediately with <!DOCTYPE html>.`;

// Helper to get the client with the user's key
const getGenAIClient = () => {
  const apiKey = localStorage.getItem('user_gemini_api_key');
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Minimal generation to test access
    await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts: [{ text: "test" }] },
    });
    return true;
  } catch (error) {
    console.error("API Validation Failed:", error);
    return false;
  }
}

export async function bringToLife(prompt: string, fileBase64?: string, mimeType?: string): Promise<string> {
  const ai = getGenAIClient();
  const parts: any[] = [];
  
  // Strong directive for file-only inputs with emphasis on NO external images
  const finalPrompt = fileBase64 
    ? "Analyze this image/document. Detect what functionality is implied. If it is a real-world object (like a desk), gamify it (e.g., a cleanup game). Build a fully interactive web app. IMPORTANT: Do NOT use external image URLs. Recreate the visuals using CSS, SVGs, or Emojis. Ensure all user-facing text is in Simplified Chinese." 
    : prompt || "创建一个展示你能力的演示应用。";

  parts.push({ text: finalPrompt });

  if (fileBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: fileBase64,
        mimeType: mimeType,
      },
    });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5, // Higher temperature for more creativity with mundane inputs
      },
    });

    let text = response.text || "<!-- 生成内容失败 -->";

    // Cleanup if the model still included markdown fences despite instructions
    text = text.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

    return text;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}

export async function updateCode(currentHtml: string, userPrompt: string): Promise<string> {
  const ai = getGenAIClient();
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          { text: "Here is the current HTML code:" },
          { text: currentHtml },
          { text: `User Request: ${userPrompt}` },
          { text: "Please provide the updated full HTML code." }
        ]
      },
      config: {
        systemInstruction: UPDATE_SYSTEM_INSTRUCTION,
        temperature: 0.5,
      },
    });

    let text = response.text || currentHtml;
    // Cleanup markdown fences
    text = text.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
    
    return text;
  } catch (error) {
    console.error("Gemini Update Error:", error);
    throw error;
  }
}