const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');
const productsDir = path.join(imagesDir, 'produkty');
const portraitsDir = path.join(imagesDir, 'portrety');

// Upewnij się, że foldery istnieją
if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });
if (!fs.existsSync(portraitsDir)) fs.mkdirSync(portraitsDir, { recursive: true });

function getImagesFromDir(dirPath) {
    if (!fs.existsSync(dirPath)) return [];

    return fs.readdirSync(dirPath)
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
        });
}

const galleryData = {
    produkty: getImagesFromDir(productsDir),
    portrety: getImagesFromDir(portraitsDir)
};

const outputPath = path.join(__dirname, 'gallery-data.json');
fs.writeFileSync(outputPath, JSON.stringify(galleryData, null, 2));

console.log('✅ Zaktualizowano gallery-data.json!');
console.log(`- Znaleziono zdjęć w produkty: ${galleryData.produkty.length}`);
console.log(`- Znaleziono zdjęć w portrety: ${galleryData.portrety.length}`);
