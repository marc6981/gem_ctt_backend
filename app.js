require("dotenv").config();
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const cors = require("cors");

const { extractGemsFromImage } = require("./image_extraction"); // Assurez-vous d'importer la fonction extractGemsFromImage correctement

const app = express();
const port = 5000;

app.use(cors());

mongoose
  .connect(`${process.env.MONGO_URI}${process.env.MONGO_DB_NAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const imageSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  imageBase64: String,
  gem: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  created_by: {
    type: String,
    default: null,
  },
});

const Images = mongoose.model("images", imageSchema);

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.array("images", 100), async (req, res) => {
  try {
    const { created_by } = req.body;

    console.log("created_by", created_by);

    const imageUploads = [];

    for (const file of req.files) {
      const existingImage = await Images.findOne({
        filename: file.originalname,
      });

      if (existingImage) {
        console.log(`Image "${file.originalname}" existe déjà, skipping...`);
        continue;
      }

      console.log(
        `Uploading image "${file.originalname}" content type: ${file.mimetype}`
      );
      imageUploads.push({
        filename: file.originalname,
        contentType: file.mimetype,
        imageBase64: file.buffer.toString("base64"),
        gem: undefined,
        created_by: created_by || null,
      });
    }

    if (imageUploads.length === 0) {
      return res.status(400).send("No new images to upload");
    }

    for (const image of imageUploads) {
      await Images.create(image);
    }

    for (const image of imageUploads) {
      const gemResult = await extractGemsFromImage(
        Buffer.from(image.imageBase64, "base64")
      );
      const gem = gemResult.gem !== null ? gemResult.gem : -1;

      console.log("gem", gem);

      await Images.updateOne({ filename: image.filename }, { gem: gem });
    }

    console.log("Images uploaded and stored in DB successfully");

    res.status(201).send("New images uploaded and stored in DB successfully");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error uploading images");
  }
});

app.get("/images", async (req, res) => {
  try {
    // Récupérer toutes les images sans inclure le champ imageBase64
    const images = await Images.find({}, { imageBase64: 0 });

    // Envoyer la réponse avec les images
    res.status(200).json(images);
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).send("Error fetching images");
  }
});

// Lancer le serveur
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
