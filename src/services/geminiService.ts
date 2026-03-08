import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const generateFashionImage = async (prompt: string) => {
  if (!apiKey) throw new Error("Gemini API key is missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const model = ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        { text: `High-end fashion garment design: ${prompt}. Futuristic, luxury, professional studio lighting, 8k resolution, elegant fabric textures.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
      }
    }
  });

  const response = await model;
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const createAvatarFromPhoto = async (base64Photo: string) => {
  if (!apiKey) throw new Error("Gemini API key is missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const [mimeType, data] = base64Photo.split(",");
  const actualMimeType = mimeType.match(/:(.*?);/)?.[1] || "image/png";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          inlineData: {
            data: data,
            mimeType: actualMimeType,
          },
        },
        { text: "Create a realistic high-end fashion model avatar. FACE PRESERVATION: The avatar MUST have the EXACT facial structure, skin tone, eyes, nose, lips, and hairstyle as the person in the uploaded photo. It should look like the same person. AUTOMATIC ALIGNMENT: Place this face naturally and perfectly onto a professional runway model's body. Full body shot, standing in a neutral pose on a minimalist studio background. Realistic textures, studio lighting, professional fashion photography style." }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to create avatar");
};

export const applyOutfitToAvatar = async (avatarImage: string, outfitPrompt: string, referenceImage?: string) => {
  if (!apiKey) throw new Error("Gemini API key is missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const avatarParts = avatarImage.split(",");
  const avatarData = avatarParts[1];
  const avatarMime = avatarParts[0].match(/:(.*?);/)?.[1] || "image/png";

  const parts: any[] = [
    {
      inlineData: {
        data: avatarData,
        mimeType: avatarMime,
      },
    }
  ];

  if (referenceImage) {
    const refParts = referenceImage.split(",");
    parts.push({
      inlineData: {
        data: refParts[1],
        mimeType: refParts[0].match(/:(.*?);/)?.[1] || "image/png",
      },
    });
  }

  parts.push({ text: `Apply this specific outfit to the avatar: ${outfitPrompt}. CRITICAL: Preserve the avatar's face identity and facial features perfectly. Do not change the face. The avatar should be wearing the outfit naturally as if on a runway. High-fashion photography style.` });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: parts
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to apply outfit");
};

export const generateFromSketch = async (avatarImage: string, sketchImage: string, prompt: string) => {
  if (!apiKey) throw new Error("Gemini API key is missing");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const avatarParts = avatarImage.split(",");
  const sketchParts = sketchImage.split(",");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          inlineData: {
            data: avatarParts[1],
            mimeType: avatarParts[0].match(/:(.*?);/)?.[1] || "image/png",
          },
        },
        {
          inlineData: {
            data: sketchParts[1],
            mimeType: sketchParts[0].match(/:(.*?);/)?.[1] || "image/png",
          },
        },
        { text: `Transform this sketch into a high-end fashion garment and apply it to the avatar. Additional details: ${prompt}. CRITICAL: Preserve the avatar's face identity perfectly. The final output should look like a professional fashion photograph.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate from sketch");
};

export const customizeDesign = async (currentImage: string, customizations: {
  color?: string;
  sleeves?: string;
  length?: string;
  fabric?: string;
  pattern?: string;
}) => {
  if (!apiKey) throw new Error("Gemini API key is missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const parts = currentImage.split(",");

  const customPrompt = Object.entries(customizations)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          inlineData: {
            data: parts[1],
            mimeType: parts[0].match(/:(.*?);/)?.[1] || "image/png",
          },
        },
        { text: `Modify the garment in this image with the following customizations: ${customPrompt}. Maintain the avatar's face identity and the overall composition. High-end fashion quality.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to customize design");
};
