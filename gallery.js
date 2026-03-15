var fullImgBox = document.getElementById("fullImgBox");
var fullImg = document.getElementById("fullImg");

function openFullImg(pic) {
    fullImgBox.style.display = "flex";
    fullImg.src = pic;
}

function closeFullImg() {
    fullImgBox.style.display = "none";
}

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