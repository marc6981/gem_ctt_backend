const multer = require("multer");
const { extractGemsFromImage } = require("../image_extraction");
const Images = require("../services/db").Images;

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadImages = upload.array("images", 100);

const uploadImagesController = async (files, created_by) => {
  const imageUploads = [];

  for (const file of files) {
    console.log("file", file);

    const existingImage = await Images.findOne({ filename: file.originalname });

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
    throw new Error("No new images to upload");
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
};

const getImagesController = async () => {
  const images = await Images.find({}, { imageBase64: 0 });
  return images;
};

const getImageToValidateController = async (includeImageBase64) => {
  const projection = includeImageBase64 ? {} : { imageBase64: 0 };

  return await Images.findOne({ validation: false }, projection);
};

const validateImageController = async (id) => {
  const image = await Images.findById(id);
  if (!image || image.validation) {
    return null;
  }
  image.validation = true;
  await image.save();
  return image;
};

const updateImageGemController = async (id, gem) => {
  const image = await Images.findById(id);
  if (!image) {
    return null;
  }
  image.gem = gem;
  await image.save();
  return image;
};

const getImageByIdController = async (id, includeImageBase64) => {
  const projection = includeImageBase64 ? {} : { imageBase64: 0 };

  const image = await Images.findById(id, projection);
  return image;
};

module.exports = {
  uploadImages,
  uploadImagesController,
  getImagesController,
  getImageToValidateController,
  validateImageController,
  updateImageGemController,
  getImageByIdController,
};
