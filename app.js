require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./services/db");
const routes = require("./routes/images");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connexion à MongoDB
db.connect();

// Utilisation des routes
app.use("/", routes);

// Lancer le serveur
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
