require('dotenv').config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");

const config = require('./config');

if (!config.db) {
  throw new Error('MONGO_URI must be set in the environment.');
}

if (!config.secret) {
  throw new Error('JWT_SECRET must be set in the environment.');
}

const hostname = "0.0.0.0";
const port = Number(process.env.PORT) || 5000;

mongoose.connect(config.db)
.then(() => console.log('Conection successful!'))
.catch((err) => console.error(err));

let router = require('./router');
var app = express();
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(router.init());

const server = http.Server(app);

server.listen(port, hostname, () => {
  console.log(`Server running on port ${port}`);
});