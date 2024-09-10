const mongoose = require("mongoose");

const connect = () => {
  mongoose
    .connect(`${process.env.MONGO_URI}${process.env.MONGO_DB_NAME}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));
};

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
  validation: {
    type: Boolean,
    default: false, // Ajoute ce champ pour gérer la validation
  },
});

const Images = mongoose.model("images", imageSchema);

module.exports = {
  connect,
  Images,
};
