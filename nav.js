// nav.js - pełnoekranowe menu mobilne, otwierane "kołem" od hamburgera
const navSlide = () => {
    const burger = document.querySelector('.burger');
    const links = document.querySelector('.nav-links');
    if (!burger || !links) return;

    // Menu musi leżeć poza <nav> (backdrop-filter psułby position: fixed), więc je klonujemy
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.id = 'mobile-menu';

    const list = links.cloneNode(true);
    list.className = 'menu-links';
    list.querySelectorAll('li').forEach((li, i) => {
        li.style.setProperty('--i', i);
        li.querySelector('a').dataset.num = String(i + 1).padStart(2, '0');
    });

    const foot = document.createElement('p');
    foot.className = 'menu-foot';
    foot.textContent = 'MICHJUX PHOTOGRAPHY';

    overlay.append(list, foot);
    document.body.appendChild(overlay);
    burger.setAttribute('aria-controls', overlay.id);

    const toggle = force => {
        const open = document.body.classList.toggle('menu-open', force);
        burger.classList.toggle('toggle', open);
        burger.setAttribute('aria-expanded', open);
    };

    burger.addEventListener('click', () => toggle());
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') toggle(false);
    });
    matchMedia('(min-width: 861px)').addEventListener('change', e => {
        if (e.matches) toggle(false);
    });
};

navSlide();
