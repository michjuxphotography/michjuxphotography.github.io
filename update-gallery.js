const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'images');
const productsDir = path.join(imagesDir, 'produkty');
const portraitsDir = path.join(imagesDir, 'portrety');
// Pomniejszone kopie zdjęć (generowane, nie trzymamy ich w repozytorium)
const resizedDir = path.join(imagesDir, '_m');

// Rozmiary: "sm" do kafelków galerii, "lg" do podglądu i tła strony głównej
const sizes = { sm: 1000, lg: 2400 };

// Upewnij się, że foldery istnieją
if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });
if (!fs.existsSync(portraitsDir)) fs.mkdirSync(portraitsDir, { recursive: true });

function getImagesFromDir(dirPath) {
    if (!fs.existsSync(dirPath)) return [];

    return fs.readdirSync(dirPath)
        .filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext);
        })
        // Kolejność jak w eksploratorze: 2.jpg przed 10.jpg
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// Pełne zdjęcia mają ~24 Mpx - telefon po ich zdekodowaniu nie ma pamięci na płynne animacje.
// Zwraca true, gdy wszystkie pomniejszone wersje są gotowe.
async function makeResized(galleryData) {
    let sharp;
    try {
        sharp = require('sharp');
    } catch {
        console.warn("⚠️  Brak modułu 'sharp' - pomijam pomniejszanie zdjęć (strona użyje oryginałów).");
        return false;
    }
    for (const [folder, files] of Object.entries(galleryData)) {
        for (const file of files) {
            const src = path.join(imagesDir, folder, file);
            const name = file.replace(/\.[^.]+$/, '.webp');
            for (const [size, width] of Object.entries(sizes)) {
                const out = path.join(resizedDir, folder, size, name);
                if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
                fs.mkdirSync(path.dirname(out), { recursive: true });
                await sharp(src)
                    .rotate()
                    .resize({ width, withoutEnlargement: true })
                    .webp({ quality: size === 'sm' ? 78 : 84 })
                    .toFile(out);
            }
        }
    }
    return true;
}

(async () => {
    const galleryData = {
        produkty: getImagesFromDir(productsDir),
        portrety: getImagesFromDir(portraitsDir)
    };

    const resized = await makeResized(galleryData);

    const outputPath = path.join(__dirname, 'gallery-data.json');
    fs.writeFileSync(outputPath, JSON.stringify({ ...galleryData, resized }, null, 2));

    console.log('✅ Zaktualizowano gallery-data.json!');
    console.log(`- Znaleziono zdjęć w produkty: ${galleryData.produkty.length}`);
    console.log(`- Znaleziono zdjęć w portrety: ${galleryData.portrety.length}`);
    console.log(`- Pomniejszone kopie: ${resized ? 'tak' : 'nie'}`);
})().catch(error => {
    console.error(error);
    process.exit(1);
});
