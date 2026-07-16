const sharp = require('sharp');
const fs = require('fs');

sharp('public/maintenance.png')
  .webp({ lossless: true })
  .toFile('public/maintenance.webp')
  .then(() => {
    console.log("Successfully converted to webp.");
    // Optionally delete the png
    fs.unlinkSync('public/maintenance.png');
  })
  .catch(err => {
    console.error(err);
  });
