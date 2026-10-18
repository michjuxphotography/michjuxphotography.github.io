// fx.js - efekty wizualne: tło WebGL, kursor, przejścia stron, animacje tekstu
(() => {
    const root = document.documentElement;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const lowPower = !finePointer || innerWidth < 768;

    /* ---------- Tło WebGL: płynna "aurora" reagująca na kursor i dotyk ---------- */
    const palettes = {
        home: [[0.07, 0.12, 0.81], [0.13, 0.83, 0.93], [0.66, 0.33, 0.97]],
        port: [[0.40, 0.12, 0.80], [0.93, 0.28, 0.60], [0.25, 0.35, 1.00]],
        prod: [[0.02, 0.45, 0.38], [0.45, 0.85, 0.25], [0.13, 0.75, 0.90]],
        price: [[0.07, 0.12, 0.81], [0.13, 0.70, 0.88], [0.20, 0.83, 0.60]]
    };

    const fragment = `
        precision mediump float;
        uniform vec2 r;
        uniform float t, s, e;
        uniform vec2 m;
        uniform vec3 c1, c2, c3;

        float h(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }
        float n(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x),
                       mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            mat2 R = mat2(0.8, 0.6, -0.6, 0.8);
            for (int i = 0; i < OCT; i++) { v += a * n(p); p = R * p * 2.03; a *= 0.5; }
            return v;
        }
        void main() {
            vec2 uv = gl_FragCoord.xy / r;
            float k = min(r.x, r.y);
            vec2 p = (gl_FragCoord.xy - 0.5 * r) / k;
            vec2 dm = p - (m - 0.5) * r / k;
            float d2 = dot(dm, dm);
            float T = t * 0.06;

            p.y += s * 0.35;
            p -= dm * (0.35 + e * 0.8) * exp(-d2 * 6.0);

            vec2 q = vec2(fbm(p * 1.3 + vec2(0.0, T)), fbm(p * 1.3 + vec2(5.2, 1.3) - T));
            vec2 w = vec2(fbm(p * 1.6 + q * 2.2 + vec2(1.7, 9.2) + T * 1.3),
                          fbm(p * 1.6 + q * 2.2 + vec2(8.3, 2.8) - T));
            float f = fbm(p * 1.4 + w * 2.0);

            vec3 col = vec3(0.012, 0.018, 0.04);
            col = mix(col, c1, smoothstep(0.25, 0.85, f) * 0.9);
            col = mix(col, c2, smoothstep(0.45, 1.0, w.x) * 0.55);
            col = mix(col, c3, smoothstep(0.5, 1.0, q.y * f * 1.6) * 0.5);

            float rib = abs(sin(w.y * 6.0 + f * 4.0 + t * 0.25));
            col += c2 * pow(1.0 - rib, 18.0) * 0.3 * f;

            col *= 0.22 + 0.9 * f * f;
            col += mix(c2, c3, 0.5) * (0.12 + e * 0.35) * exp(-d2 * 9.0);
            col *= 1.0 - 0.7 * pow(length(uv - 0.5) * 1.25, 2.2);
            col += (h(gl_FragCoord.xy + fract(t)) - 0.5) * 0.02;
            gl_FragColor = vec4(col, 1.0);
        }`;

    function initBackground() {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        const gl = canvas.getContext('webgl', { antialias: false, depth: false, alpha: false, powerPreference: 'low-power' });
        if (!gl) return;

        const compile = (type, src) => {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                console.warn(gl.getShaderInfoLog(sh));
                return null;
            }
            return sh;
        };
        const vs = compile(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}');
        // Szum liczony jest 5 razy na piksel - na telefonach wystarczą 3 oktawy zamiast 5
        const fs = compile(gl.FRAGMENT_SHADER, `#define OCT ${lowPower ? 3 : 5}\n${fragment}`);
        if (!vs || !fs) return;

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
        gl.useProgram(prog);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const u = {};
        ['r', 't', 's', 'e', 'm', 'c1', 'c2', 'c3'].forEach(name => u[name] = gl.getUniformLocation(prog, name));

        const palette = palettes[document.body.dataset.theme] || palettes.home;
        gl.uniform3fv(u.c1, palette[0]);
        gl.uniform3fv(u.c2, palette[1]);
        gl.uniform3fv(u.c3, palette[2]);

        // Renderujemy w obniżonej rozdzielczości - szum jest miękki, a telefony to docenią
        const quality = lowPower ? 0.25 : 0.5;
        function resize() {
            const w = Math.max(1, Math.round(innerWidth * quality));
            const h = Math.max(1, Math.round(innerHeight * quality));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                gl.viewport(0, 0, w, h);
                gl.uniform2f(u.r, w, h);
            }
        }
        addEventListener('resize', resize);
        resize();

        let tx = 0.5, ty = 0.5, mx = 0.5, my = 0.5, energy = 0;
        const onMove = (x, y) => {
            const nx = x / innerWidth, ny = 1 - y / innerHeight;
            energy = Math.min(1, energy + Math.hypot(nx - tx, ny - ty) * 4);
            tx = nx;
            ty = ny;
        };
        addEventListener('pointermove', e => onMove(e.clientX, e.clientY), { passive: true });
        addEventListener('touchmove', e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        addEventListener('pointerdown', e => { onMove(e.clientX, e.clientY); energy = 1; }, { passive: true });

        const start = performance.now() - Math.random() * 20000;
        function frame(now) {
            mx += (tx - mx) * 0.06;
            my += (ty - my) * 0.06;
            energy *= 0.96;
            gl.uniform1f(u.t, (now - start) / 1000);
            gl.uniform1f(u.s, scrollY / innerHeight);
            gl.uniform1f(u.e, energy);
            gl.uniform2f(u.m, mx, my);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        if (reduceMotion) {
            frame(start + 10000);
            addEventListener('resize', () => frame(start + 10000));
        } else {
            // Na telefonach 30 kl./s - tło płynie wolno, a GPU zostaje dla przewijania i reszty animacji
            const minGap = lowPower ? 1000 / 30 - 4 : 0;
            let last = 0;
            const loop = now => {
                if (now - last >= minGap) {
                    last = now;
                    frame(now);
                }
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }
        root.classList.add('webgl');
        requestAnimationFrame(() => canvas.classList.add('ready'));
    }

    /* ---------- Własny kursor ---------- */
    function initCursor() {
        if (!finePointer || reduceMotion) return;
        const dot = document.createElement('div');
        const ring = document.createElement('div');
        dot.className = 'cursor-dot';
        ring.className = 'cursor-ring';
        document.body.append(dot, ring);
        root.classList.add('has-cursor', 'cursor-hidden');

        let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
        addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            x = e.clientX;
            y = e.clientY;
            dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            root.classList.remove('cursor-hidden');
        }, { passive: true });
        document.addEventListener('mouseleave', () => root.classList.add('cursor-hidden'));
        addEventListener('pointerdown', () => ring.classList.add('down'));
        addEventListener('pointerup', () => ring.classList.remove('down'));

        document.addEventListener('pointerover', e => {
            const tile = e.target.closest('.tile-inner');
            const hot = !tile && e.target.closest('a, button, input, label, .burger');
            ring.classList.toggle('view', !!tile);
            ring.classList.toggle('hover', !!hot);
            ring.dataset.label = tile ? 'ZOBACZ' : '';
        });

        (function loop() {
            rx += (x - rx) * 0.18;
            ry += (y - ry) * 0.18;
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
            requestAnimationFrame(loop);
        })();
    }

    /* ---------- Przejścia między stronami (kurtyna) ---------- */
    function initTransitions() {
        document.addEventListener('click', e => {
            const a = e.target.closest('a[href]');
            if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (a.target === '_blank' || a.hasAttribute('download')) return;
            const url = new URL(a.href, location.href);
            if (url.origin !== location.origin) return;
            if (url.pathname === location.pathname && url.hash) return;
            if (reduceMotion) return;
            e.preventDefault();
            root.classList.add('leaving');
            setTimeout(() => { location.href = url.href; }, 620);
        });
        // Powrót przyciskiem "wstecz" z pamięci podręcznej
        addEventListener('pageshow', e => {
            if (e.persisted) root.classList.remove('leaving');
        });
    }

    /* ---------- Tekst: scramble, rozbijanie na litery, glitch ---------- */
    const glyphs = 'ABCDEFGHIJKLMNOPRSTUWXYZ0123456789#%&*+=<>/\\';

    function scramble(el) {
        const text = el.textContent;
        let frame = 0;
        const step = () => {
            let out = '';
            let done = true;
            for (let i = 0; i < text.length; i++) {
                const c = text[i];
                if (c === ' ' || frame >= 10 + i * 3) {
                    out += c;
                } else {
                    out += glyphs[Math.random() * glyphs.length | 0];
                    done = false;
                }
            }
            el.textContent = out;
            frame++;
            if (!done) setTimeout(() => requestAnimationFrame(step), 32);
        };
        step();
    }

    function initText() {
        document.querySelectorAll('[data-split]').forEach(el => {
            const text = el.textContent;
            el.setAttribute('aria-label', text);
            el.textContent = '';
            [...text].forEach((c, i) => {
                const span = document.createElement('span');
                span.className = 'ch';
                span.setAttribute('aria-hidden', 'true');
                span.style.setProperty('--i', i);
                span.textContent = c;
                el.appendChild(span);
            });
        });

        if (reduceMotion) return;

        const scrambled = document.querySelectorAll('[data-scramble]');
        setTimeout(() => scrambled.forEach(scramble), 650);

        // Losowe "zakłócenia" i błyski flesza na nagłówkach (działa też na telefonach, gdzie nie ma hovera)
        const effects = [
            ...[...document.querySelectorAll('.glitch')].map(el => ({ el, cls: 'glitching', ms: 460 })),
            ...[...document.querySelectorAll('.flash')].map(el => ({ el, cls: 'flashing', ms: 950 }))
        ];
        const fire = ({ el, cls, ms }) => {
            // Błysk flesza rozświetla też tło całej sekcji na stronie głównej
            const targets = [el, el.closest('.split-section')].filter(Boolean);
            targets.forEach(t => {
                t.classList.remove(cls);
                void t.offsetWidth;
                t.classList.add(cls);
            });
            setTimeout(() => targets.forEach(t => t.classList.remove(cls)), ms);
        };
        effects.forEach(fx => {
            const hoverTarget = fx.el.closest('a') || fx.el;
            hoverTarget.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') fire(fx); });
        });
        // Losujemy tylko spośród nagłówków widocznych na ekranie (i rzadziej na telefonach)
        const visible = new Set('IntersectionObserver' in window ? [] : effects);
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(entries => entries.forEach(entry => {
                const fx = effects.find(f => f.el === entry.target);
                entry.isIntersecting ? visible.add(fx) : visible.delete(fx);
            }));
            effects.forEach(fx => io.observe(fx.el));
        }
        (function schedule() {
            setTimeout(() => {
                const pool = [...visible];
                if (pool.length && !document.hidden) fire(pool[Math.random() * pool.length | 0]);
                schedule();
            }, (2200 + Math.random() * 3500) * (lowPower ? 2 : 1));
        })();
    }

    /* ---------- Pojawianie się przy przewijaniu + odliczanie liczb ---------- */
    function countUp(el) {
        const target = parseFloat(el.dataset.count);
        const decimals = (el.dataset.count.split('.')[1] || '').length;
        const suffix = el.dataset.suffix || '';
        const t0 = performance.now();
        const step = now => {
            const k = Math.min(1, (now - t0) / 1200);
            const v = target * (1 - Math.pow(1 - k, 4));
            el.textContent = v.toFixed(decimals).replace('.', ',') + suffix;
            if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    function initReveal() {
        const targets = document.querySelectorAll('[data-reveal], [data-count]');
        if (!('IntersectionObserver' in window)) {
            targets.forEach(el => el.classList.add('in'));
            return;
        }
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                io.unobserve(el);
                // Poczekaj aż zejdzie kurtyna przy elementach widocznych od razu
                const delay = performance.now() < 900 ? 650 : 0;
                setTimeout(() => {
                    el.classList.add('in');
                    if (el.dataset.count && !reduceMotion) countUp(el);
                }, delay);
            });
        }, { threshold: 0.12 });
        targets.forEach(el => io.observe(el));
    }

    /* ---------- Reflektor na kartach ---------- */
    function initSpotlight() {
        document.querySelectorAll('.glow-card').forEach(card => {
            const move = (x, y) => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${x - r.left}px`);
                card.style.setProperty('--my', `${y - r.top}px`);
            };
            card.addEventListener('pointermove', e => move(e.clientX, e.clientY));
            card.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        });
    }

    /* ---------- Magnetyczne przyciski ---------- */
    function initMagnetic() {
        if (!finePointer || reduceMotion) return;
        document.querySelectorAll('[data-magnetic]').forEach(el => {
            el.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const dx = e.clientX - r.left - r.width / 2;
                const dy = e.clientY - r.top - r.height / 2;
                el.style.transform = `translate(${dx * 0.3}px, ${dy * 0.3}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });
    }

    /* ---------- Fala po kliknięciu ---------- */
    function initRipple() {
        document.addEventListener('pointerdown', e => {
            const btn = e.target.closest('.btn-calc, .lb-btn');
            if (!btn) return;
            const r = btn.getBoundingClientRect();
            const size = Math.max(r.width, r.height);
            const wave = document.createElement('span');
            wave.className = 'ripple';
            wave.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
            btn.appendChild(wave);
            setTimeout(() => wave.remove(), 650);
        });
    }

    /* ---------- Paralaksa strony głównej (mysz / żyroskop) ---------- */
    function initParallax() {
        const choice = document.querySelector('.choice');
        if (!choice || reduceMotion) return;
        let tx = 0, ty = 0, cx = 0, cy = 0, running = false;
        const loop = () => {
            cx += (tx - cx) * 0.07;
            cy += (ty - cy) * 0.07;
            choice.style.setProperty('--px', cx.toFixed(3));
            choice.style.setProperty('--py', cy.toFixed(3));
            if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) requestAnimationFrame(loop);
            else running = false;
        };
        const kick = () => {
            if (!running) {
                running = true;
                requestAnimationFrame(loop);
            }
        };
        const clamp = v => Math.max(-1, Math.min(1, v));
        addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            tx = (e.clientX / innerWidth) * 2 - 1;
            ty = (e.clientY / innerHeight) * 2 - 1;
            kick();
        }, { passive: true });
        // Żyroskop drży nawet gdy telefon leży - bez progu pętla nigdy by się nie zatrzymała
        const step = v => Math.round(v * 25) / 25;
        addEventListener('deviceorientation', e => {
            if (e.gamma == null) return;
            const nx = step(clamp(e.gamma / 25));
            const ny = step(clamp((e.beta - 45) / 25));
            if (nx === tx && ny === ty) return;
            tx = nx;
            ty = ny;
            kick();
        });
    }

    /* ---------- Tła strony głównej: pomniejszone kopie zamiast zdjęć 24 Mpx ---------- */
    function initSplitImages() {
        document.querySelectorAll('.split-bg[data-img]').forEach(el => {
            const name = el.dataset.img;
            const set = src => el.style.setProperty('--img', `url('${src}')`);
            const img = new Image();
            img.onload = () => set(img.src);
            // Lokalnie (bez uruchomienia update-gallery.js) kopii nie ma - wtedy oryginał
            img.onerror = () => set(`images/${name}`);
            img.src = `images/_m/${name.replace(/^([^/]+)\//, '$1/lg/').replace(/\.[^.]+$/, '.webp')}`;
        });
    }

    /* ---------- Pasek nawigacji przy przewijaniu ---------- */
    function initNavScroll() {
        const nav = document.querySelector('nav');
        if (!nav) return;
        const update = () => nav.classList.toggle('scrolled', scrollY > 30);
        addEventListener('scroll', update, { passive: true });
        update();
    }

    initSplitImages();
    initBackground();
    initCursor();
    initTransitions();
    initText();
    initReveal();
    initSpotlight();
    initMagnetic();
    initRipple();
    initParallax();
    initNavScroll();
})();
