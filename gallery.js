// gallery.js - ładowanie galerii, kafelki 3D i lightbox (zoom, przesuwanie, swipe)
(() => {
    const gallery = document.querySelector('.img-gallery');
    const box = document.getElementById('fullImgBox');
    if (!gallery || !box) return;

    const stage = box.querySelector('.lb-stage');
    const frame = box.querySelector('.lb-frame');
    const fullImg = document.getElementById('fullImg');
    const curLabel = box.querySelector('.lb-cur');
    const totalLabel = box.querySelector('.lb-total');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

    const pad = n => String(n).padStart(2, '0');
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    let images = [];
    let current = 0;
    let isOpen = false;
    let scale = 1, pointX = 0, pointY = 0;

    // Zabezpieczenie zdjęć przed pobieraniem (prawy klik i przeciąganie)
    document.addEventListener('contextmenu', e => {
        if (e.target.tagName === 'IMG') e.preventDefault();
    });
    document.addEventListener('dragstart', e => {
        if (e.target.tagName === 'IMG') e.preventDefault();
    });

    /* ---------- Kafelki ---------- */
    const revealer = 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => {
            entries.filter(e => e.isIntersecting).forEach((entry, k) => {
                const tile = entry.target;
                revealer.unobserve(tile);
                tile.style.setProperty('--d', `${k * 0.12}s`);
                tile.classList.add('in');
                // Po animacji wejścia hover ma reagować bez opóźnienia
                setTimeout(() => tile.style.setProperty('--d', '0s'), 1700 + k * 120);
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' })
        : null;

    function attachTilt(el) {
        let raf = 0;
        el.addEventListener('pointerenter', e => {
            if (e.pointerType === 'mouse') el.classList.add('tilting');
        });
        el.addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            const r = el.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                el.style.setProperty('--rx', `${((0.5 - y) * 14).toFixed(2)}deg`);
                el.style.setProperty('--ry', `${((x - 0.5) * 14).toFixed(2)}deg`);
                el.style.setProperty('--gx', `${x * 100}%`);
                el.style.setProperty('--gy', `${y * 100}%`);
            });
        });
        el.addEventListener('pointerleave', () => {
            cancelAnimationFrame(raf);
            el.classList.remove('tilting');
            el.style.setProperty('--rx', '0deg');
            el.style.setProperty('--ry', '0deg');
        });
    }

    function buildTile(src, i, label) {
        const tile = document.createElement('figure');
        tile.className = 'tile';

        const inner = document.createElement('div');
        inner.className = 'tile-inner';
        inner.tabIndex = 0;
        inner.setAttribute('role', 'button');
        inner.setAttribute('aria-label', `${label} – zdjęcie ${i + 1}`);

        const img = document.createElement('img');
        img.src = src;
        img.alt = `${label} – zdjęcie ${i + 1}`;
        img.loading = i < 3 ? 'eager' : 'lazy';
        img.decoding = 'async';

        const glare = document.createElement('span');
        glare.className = 'tile-glare';
        const num = document.createElement('span');
        num.className = 'tile-num';
        num.textContent = pad(i + 1);

        inner.append(img, glare, num);
        tile.appendChild(inner);

        inner.addEventListener('click', () => open(i, img));
        inner.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open(i, img);
            }
        });
        if (finePointer) attachTilt(inner);
        return tile;
    }

    /* ---------- Lightbox ---------- */
    function setTransform() {
        fullImg.style.transform = `translate3d(${pointX}px, ${pointY}px, 0) scale(${scale})`;
    }

    function resetZoom() {
        scale = 1;
        pointX = 0;
        pointY = 0;
        fullImg.style.transition = '';
        setTransform();
    }

    // Powiększenie z zachowaniem punktu pod kursorem / palcami
    function zoomAt(cx, cy, next, animate) {
        const r = frame.getBoundingClientRect();
        const ox = cx - (r.left + r.width / 2);
        const oy = cy - (r.top + r.height / 2);
        next = clamp(next, 1, 5);
        pointX = ox - (ox - pointX) * (next / scale);
        pointY = oy - (oy - pointY) * (next / scale);
        scale = next;
        if (scale === 1) {
            pointX = 0;
            pointY = 0;
        }
        fullImg.style.transition = animate ? `transform 0.45s ${ease}` : 'none';
        setTransform();
    }

    function updateCounter() {
        curLabel.textContent = pad(current + 1);
        totalLabel.textContent = pad(images.length);
    }

    function preload(i) {
        new Image().src = images[(i + images.length) % images.length];
    }

    function open(i, thumb) {
        current = i;
        fullImg.src = images[i];
        resetZoom();
        updateCounter();
        isOpen = true;
        box.classList.add('open');
        box.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lb-lock');
        preload(i + 1);
        preload(i - 1);

        if (!thumb || reduceMotion || !frame.animate) return;
        // Zdjęcie "wylatuje" z miniatury na środek ekranu
        frame.style.opacity = '0';
        fullImg.decode().catch(() => { }).then(() => {
            const from = thumb.getBoundingClientRect();
            const to = fullImg.getBoundingClientRect();
            frame.style.opacity = '';
            if (!to.width) return;
            const dx = from.left + from.width / 2 - (to.left + to.width / 2);
            const dy = from.top + from.height / 2 - (to.top + to.height / 2);
            const s = from.width / to.width;
            frame.animate([
                { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 1 },
                { transform: 'none', opacity: 1 }
            ], { duration: 750, easing: ease });
        });
        box.querySelector('.lb-close').focus({ preventScroll: true });
    }

    function close() {
        isOpen = false;
        box.classList.remove('open');
        box.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('lb-lock');
        frame.style.transform = '';
        frame.style.opacity = '';
    }

    function go(dir, fromX = 0) {
        if (images.length < 2) return;
        const next = (current + dir + images.length) % images.length;
        resetZoom();
        frame.style.transition = 'none';
        frame.style.transform = '';
        frame.style.opacity = '';
        const swap = () => {
            current = next;
            fullImg.src = images[next];
            updateCounter();
            preload(next + dir);
            frame.animate([
                { transform: `translateX(${dir * 90}px) scale(0.96)`, opacity: 0, filter: 'blur(8px)' },
                { transform: 'none', opacity: 1, filter: 'blur(0)' }
            ], { duration: 450, easing: ease });
        };
        if (!frame.animate || reduceMotion) return swap();
        frame.animate([
            { transform: `translateX(${fromX}px)`, opacity: 1 },
            { transform: `translateX(${-dir * 120 + fromX}px)`, opacity: 0 }
        ], { duration: 180, easing: 'ease-in' }).onfinish = swap;
    }

    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', () => go(-1));
    box.querySelector('.lb-next').addEventListener('click', () => go(1));

    document.addEventListener('keydown', e => {
        if (!isOpen) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
    });

    // Zoom rolką myszy
    stage.addEventListener('wheel', e => {
        if (!isOpen) return;
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, scale * Math.exp(-e.deltaY * 0.0015), false);
    }, { passive: false });

    // Gesty: przesuwanie, pinch-zoom, swipe, podwójne stuknięcie, stuknięcie w tło
    const pointers = new Map();
    let gesture = null;
    let pinch = null;
    let lastTap = 0;

    const onImage = (x, y) => {
        const r = fullImg.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    stage.addEventListener('pointerdown', e => {
        if (!isOpen) return;
        stage.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
            gesture = null;
            frame.style.transform = '';
            frame.style.opacity = '';
        } else if (pointers.size === 1) {
            gesture = { x: e.clientX, y: e.clientY, px: pointX, py: pointY, t: Date.now(), moved: false };
            fullImg.style.transition = 'none';
            frame.style.transition = 'none';
        }
    });

    stage.addEventListener('pointermove', e => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pinch && pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.scale * dist / pinch.dist, false);
            return;
        }
        if (!gesture) return;

        const dx = e.clientX - gesture.x;
        const dy = e.clientY - gesture.y;
        if (Math.hypot(dx, dy) > 8) gesture.moved = true;

        if (scale > 1) {
            pointX = gesture.px + dx;
            pointY = gesture.py + dy;
            setTransform();
        } else if (gesture.moved) {
            // Podgląd swipe'a: w bok = następne zdjęcie, w dół = zamknięcie
            const down = Math.max(0, dy);
            frame.style.transform = `translate(${dx}px, ${down * 0.6}px) rotate(${dx * 0.02}deg) scale(${1 - down / 2000})`;
            frame.style.opacity = String(1 - Math.min(0.6, down / 400));
        }
    });

    const release = e => {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);

        if (pinch) {
            if (pointers.size < 2) pinch = null;
            if (scale < 1.05) zoomAt(0, 0, 1, true);
            return;
        }
        if (!gesture) return;

        const g = gesture;
        gesture = null;
        const dx = e.clientX - g.x;
        const dy = e.clientY - g.y;
        frame.style.transition = '';

        if (!g.moved && Date.now() - g.t < 300) {
            if (!onImage(e.clientX, e.clientY)) {
                close();
            } else if (Date.now() - lastTap < 320) {
                zoomAt(e.clientX, e.clientY, scale > 1 ? 1 : 2.5, true);
                lastTap = 0;
            } else {
                lastTap = Date.now();
            }
            return;
        }

        if (scale === 1) {
            if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) {
                go(dx < 0 ? 1 : -1, dx);
            } else if (dy > 110) {
                close();
            } else {
                frame.style.transform = '';
                frame.style.opacity = '';
            }
        }
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);

    /* ---------- Automatyczne ładowanie galerii z folderu ---------- */
    const folderName = gallery.getAttribute('data-folder');
    if (!folderName) return;
    const label = folderName === 'portrety' ? 'Portret' : 'Produkt';

    const imageExt = /\.(jpe?g|png|webp|gif|avif)$/i;
    const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true });

    // Lokalnie (Live Server, python -m http.server) serwer pokazuje listing folderu,
    // więc nowe zdjęcia widać od razu po odświeżeniu. Na GitHub Pages listingu nie ma (404).
    function listFolder() {
        return fetch(`images/${folderName}/`)
            .then(response => {
                const type = response.headers.get('content-type') || '';
                return response.ok && type.includes('html') ? response.text() : null;
            })
            .then(html => {
                if (!html) return null;
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const files = [...doc.querySelectorAll('a[href]')]
                    .map(a => decodeURIComponent(a.getAttribute('href').split(/[?#]/)[0].split('/').filter(Boolean).pop() || ''))
                    .filter(name => imageExt.test(name));
                return files.length ? [...new Set(files)].sort(byName) : null;
            })
            .catch(() => null);
    }

    // Online: manifest generowany automatycznie przez GitHub Actions (update-gallery.js)
    function readManifest() {
        return fetch('gallery-data.json')
            .then(response => {
                if (!response.ok) {
                    console.warn("Brak pliku gallery-data.json. Uruchom skrypt 'node update-gallery.js'.");
                    return null;
                }
                return response.json();
            })
            .then(data => (data && data[folderName]) || null);
    }

    listFolder()
        .then(files => files || readManifest())
        .then(files => {
            if (!files || !files.length) {
                console.log(`Brak zdjęć w folderze 'images/${folderName}/'.`);
                return;
            }
            images = files.map(name => `images/${folderName}/${encodeURIComponent(name)}`);
            gallery.innerHTML = '';
            images.forEach((src, i) => {
                const tile = buildTile(src, i, label);
                gallery.appendChild(tile);
                if (revealer) revealer.observe(tile);
                else tile.classList.add('in');
            });
            updateCounter();
            document.querySelectorAll('[data-photo-count]').forEach(el => {
                el.textContent = pad(images.length);
            });
        })
        .catch(error => console.error('Błąd podczas ładowania galerii:', error));
})();
