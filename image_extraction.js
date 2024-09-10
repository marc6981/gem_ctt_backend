require("dotenv").config();
const axios = require("axios");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL_NAME = process.env.OPENAI_MODEL_NAME;
const IMG_PATH = "./data/";

const coords = { x: 950, y: 0, width: 900, height: 225 };

const EXTRACT_PROMPT = `
In the image, I would like you to extract the number of gems I have. The number of gems is represented by a diamond icon followed by a three-digit number. Please extract that three-digit number and return the result in the following JSON format:

{"gem": 117}

If you are unable to find the number of gems, return:

{"gem": null}.
`;

async function processImage(imageBuffer, coords) {
  try {
    const metadata = await sharp(imageBuffer).metadata();

    const supportedFormats = ["jpeg", "png", "webp", "gif", "svg", "tiff"];
    if (!supportedFormats.includes(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }

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
    const base64Image = await processImage(imageBuffer, coords);

    // const filename = path.join("./image.jpg");
    // fs.writeFileSync(filename, Buffer.from(base64Image, "base64"));

    const result = await callOpenAI(base64Image);

    if (!result || typeof result.gem === "undefined") {
      console.log("error result", result);
      throw new Error("Invalid response from OpenAI");
    }

    return result;
  } catch (error) {
    console.error("Error processing image:", error);
    return { gem: -1 };
  }
}

module.exports = {
  extractGemsFromImage,
};
