let scale = 1;
let panning = false;
let pointX = 0;
let pointY = 0;
let startX = 0;
let startY = 0;

var fullImgBox = document.getElementById("fullImgBox");
var fullImg = document.getElementById("fullImg");

function openFullImg(pic) {
    fullImgBox.style.display = "flex";
    fullImg.src = pic;

    // Zresetuj przybliżenie przy każdym otwarciu nowego zdjęcia
    scale = 1;
    pointX = 0;
    pointY = 0;
    setTransform();
}

function closeFullImg() {
    fullImgBox.style.display = "none";
}

// Zamknij po kliknięciu poza zdjęciem
fullImgBox.addEventListener('click', function (e) {
    // Jeśli kliknęliśmy celowo w czarne tło (fullImgBox), a nie samo zdjęcie (fullImg)
    if (e.target === fullImgBox) {
        closeFullImg();
    }
});

function setTransform() {
    fullImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

// Obsługa przybliżania rolką myszy (Zoom)
fullImgBox.onwheel = function (e) {
    if (fullImgBox.style.display !== "flex") return;
    e.preventDefault();

    // Kontroluj tempo powiększania
    const delta = e.deltaY * -0.005;
    const newScale = scale + delta;

    // Ustaw granice powiększenia (od 0.5x do 4x)
    if (newScale >= 0.5 && newScale <= 4) {
        scale = newScale;
        setTransform();
    }
};

// Obsługa przesuwania zdjęcia w bok (Pan) - Mysz
fullImgBox.onmousedown = function (e) {
    if (e.target !== fullImg) return;
    e.preventDefault();
    panning = true;
    startX = e.clientX - pointX;
    startY = e.clientY - pointY;
    fullImg.style.cursor = "grabbing";
};

fullImgBox.onmouseup = function () {
    panning = false;
    fullImg.style.cursor = "pointer";
};

fullImgBox.onmouseleave = function () {
    panning = false;
    fullImg.style.cursor = "pointer";
};

fullImgBox.onmousemove = function (e) {
    if (!panning || e.target !== fullImg) return;
    e.preventDefault();
    pointX = e.clientX - startX;
    pointY = e.clientY - startY;
    setTransform();
};

// Touch (Mobilne przesuwanie palcem)
fullImgBox.addEventListener('touchstart', function (e) {
    if (e.target !== fullImg || e.touches.length !== 1) return;
    panning = true;
    startX = e.touches[0].clientX - pointX;
    startY = e.touches[0].clientY - pointY;
});

fullImgBox.addEventListener('touchend', function () {
    panning = false;
});

fullImgBox.addEventListener('touchmove', function (e) {
    if (!panning || e.target !== fullImg || e.touches.length !== 1) return;
    e.preventDefault();
    pointX = e.touches[0].clientX - startX;
    pointY = e.touches[0].clientY - startY;
    setTransform();
}, { passive: false });

// Zabezpieczenie zdjęć przed pobieraniem (prawy klik i przeciąganie)
document.addEventListener('contextmenu', function (event) {
    if (event.target.tagName === 'IMG') {
        event.preventDefault();
    }
});

document.addEventListener('dragstart', function (event) {
    if (event.target.tagName === 'IMG') {
        event.preventDefault();
    }
});

// Automatyczne ładowanie galerii z folderu
document.addEventListener('DOMContentLoaded', function () {
    const galleryContainer = document.querySelector('.img-gallery');
    if (!galleryContainer) return;

    // Sprawdż o jaki folder chodzi (z atrybutu data-folder, np. data-folder="produkty")
    const folderName = galleryContainer.getAttribute('data-folder');
    if (!folderName) return;

    // Pobierz manifest folderów wygenerowany przez update-gallery.js
    fetch('gallery-data.json')
        .then(response => {
            if (!response.ok) {
                console.warn("Brak pliku gallery-data.json. Uruchom skrypt 'node update-gallery.js'.");
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (!data) return;

            const images = data[folderName];
            if (images && images.length > 0) {
                // Wyczyść ewentualne statyczne obrazki dodane na sztywno
                galleryContainer.innerHTML = '';

                images.forEach(filename => {
                    const img = document.createElement('img');
                    img.src = `images/${folderName}/${filename}`;
                    img.onclick = () => openFullImg(img.src);

                    // Zabezpieczenie (opcjonalnie mozna tu przypisac dodatkowo contextmenu blokade 
                    // ale mamy to juz globalnie wyzej)
                    galleryContainer.appendChild(img);
                });
            } else {
                console.log(`Brak zdjęć w folderze 'images/${folderName}/'. Wrzuć zdjęcia i uruchom update-gallery.js`);
            }
        })
        .catch(error => console.error('Błąd podczas ładowania galerii:', error));
});