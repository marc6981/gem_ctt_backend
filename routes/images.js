const express = require("express");
const {
  uploadImages,
  uploadImagesController,
  getImagesController,
  getImageToValidateController,
  validateImageController,
  updateImageGemController,
  getImageByIdController,
} = require("../controllers/controllers");

const router = express.Router();

router.post("/upload", uploadImages, async (req, res) => {
  try {
    const { created_by } = req.body;
    console.log("created_by", created_by);

    const files = req.files;

    await uploadImagesController(files, created_by);

    res.status(201).send("New images uploaded and stored in DB successfully");
  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).send("Error uploading images");
    throw error;
  }
});

router.get("/images", async (req, res) => {
  try {
    const images = await getImagesController();
    res.status(200).json(images);
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).send("Error fetching images");
  }
});

// TODO: Add a route /images to get a image to validate
// a image to validate is a image that has validation set to false.
// The route should return the image with the information of the image and the image itself.

// TODO: Add a route /images/:id/validate post to validate a image.

// TODO: Add a route /images/:id/update post to update a number of gem for a image.

router.get("/images/validate", async (req, res) => {
  try {
    const includeImageBase64 = req.query.includeImageBase64 === "true";
    const image = await getImageToValidateController(includeImageBase64);

    if (!image) {
      // Renvoie un objet JSON pour gérer l'absence d'image
      return res
        .status(404)
        .json({ message: "No image available for validation." });
    }

    res.status(200).json(image);
  } catch (error) {
    console.error("Error fetching image for validation:", error);
    res.status(500).json({ message: "Error fetching image for validation." });
  }
});

router.post("/images/:id/validate", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await validateImageController(id);
    if (!result) {
      return res.status(404).send("Image not found or already validated.");
    }
    res.status(200).send("Image validated successfully.");
  } catch (error) {
    console.error("Error validating image:", error);
    res.status(500).send("Error validating image.");
  }
});

router.post("/images/:id/update", async (req, res) => {
  try {
    const { id } = req.params;
    const { gem } = req.body;
    const result = await updateImageGemController(id, gem);
    if (!result) {
      return res.status(404).send("Image not found.");
    }
    res.status(200).send("Image gem count updated successfully.");
  } catch (error) {
    console.error("Error updating gem count:", error);
    res.status(500).send("Error updating gem count.");
  }
});

router.get("/images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const includeImageBase64 = req.query.includeImageBase64 === "true";

    const image = await getImageByIdController(id, includeImageBase64);

    if (!image) {
      return res.status(404).send("Image not found.");
    }

    res.status(200).json(image);
  } catch (error) {
    console.error("Error fetching image by ID:", error);
    res.status(500).send("Error fetching image.");
  }
});

module.exports = router;
