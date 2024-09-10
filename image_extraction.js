// Charger les variables d'environnement
require("dotenv").config();
const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Charger les variables d'environnement depuis .env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL_NAME = process.env.OPENAI_MODEL_NAME;
const IMG_PATH = "./data/";

// Coordonnées pour découper l'image
const coords = { x: 950, y: 0, width: 295, height: 225 };

// Prompt pour extraire le nombre de gems
const EXTRACT_PROMPT = `
In the image, I would like you to extract the number of gems I have. The number of gems is represented by a diamond icon followed by a three-digit number. Please extract that three-digit number and return the result in the following JSON format:

{"gem": 117}

If you are unable to find the number of gems, return:

{"gem": null}.
`;

async function processImage(imageBuffer, coords) {
  try {
    // Obtenir les métadonnées du fichier image
    const metadata = await sharp(imageBuffer).metadata();

    // Vérification du format
    const supportedFormats = ["jpeg", "png", "webp", "gif", "svg", "tiff"];
    if (!supportedFormats.includes(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }

    // Extraire et redimensionner l'image
    const image = await sharp(imageBuffer)
      .extract({
        left: coords.x,
        top: coords.y,
        width: coords.width,
        height: coords.height,
      })
      .resize({
        width: Math.floor(coords.width / 2),
        height: Math.floor(coords.height / 2),
      })
      .toBuffer();

    return image.toString("base64");
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}

// Fonction pour appeler l'API OpenAI
async function callOpenAI(base64Image) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  };

  const payload = {
    model: OPENAI_MODEL_NAME,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: EXTRACT_PROMPT,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 300,
  };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      { headers }
    );

    // if status is not 200, throw an error
    if (response.status !== 200) {
      throw new Error(
        `Error: ${response.status} - ${response.statusText} - ${response.data}`
      );
    }

    const messageContent = response.data.choices[0].message.content;

    const jsonStr = messageContent
      .replace("```json\n", "")
      .replace("\n```", "");
    const parsedResponse = JSON.parse(jsonStr);
    return parsedResponse;
  } catch (error) {
    console.log("OpenAI error:", error.response.data);
    console.error(
      `Error: ${error.response.status} - ${error.response.statusText}`
    );
    throw error;
  }
}

async function extractGemsFromImage(imageBuffer) {
  try {
    // Prétraiter l'image (découpe et redimensionnement)
    const base64Image = await processImage(imageBuffer, coords);

    // Appel à l'API OpenAI pour extraire le nombre de gems
    const result = await callOpenAI(base64Image);

    // Vérification que la réponse existe et est bien formée
    if (!result || typeof result.gem === "undefined") {
      console.log("error result", result);
      throw new Error("Invalid response from OpenAI");
    }

    // Retourner le résultat même si gem est null
    return result;
  } catch (error) {
    console.error("Error processing image:", error);
    return { gem: -1 }; // Valeur par défaut si l'API échoue
  }
}

module.exports = {
  extractGemsFromImage,
};
