const fs = require("fs");
const path = require("path");

const imagesDirectory = path.join(__dirname, "..", "images");

module.exports = (req, res, next) => {
  try {
    const imageData = req.body.base64image;

    if (!imageData || typeof imageData !== "string") {
      return res.status(400).json({
        message: "The image must be sent in the base64image field.",
      });
    }

    const matches = imageData.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!matches) {
      return res.status(400).json({
        message: "The image must be a base64 data URL.",
      });
    }

    const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
    const imageName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const imagePath = path.join(imagesDirectory, imageName);

    fs.mkdirSync(imagesDirectory, { recursive: true });
    fs.writeFileSync(imagePath, matches[2], { encoding: "base64" });

    req.body.photo = `/images/${imageName}`;
    delete req.body.base64image;
    next();
  } catch (error) {
    next(error);
  }
};
