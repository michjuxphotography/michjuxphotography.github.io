// glow.js - Skrypt do obsługi tła reagującego na myszkę

document.addEventListener('DOMContentLoaded', () => {
    const glowBlob = document.querySelector('.glow-blob');
    
    if (glowBlob) {
        document.addEventListener('mousemove', (e) => {
            const x = e.clientX;
            const y = e.clientY;
            
            // Delikatne opóźnienie i płynne podążanie realizowane jest przez CSS transition,
            // tutaj tylko aktualizujemy pozycję docelową.
            
            glowBlob.style.left = `${x}px`;
            glowBlob.style.top = `${y}px`;
        });
        
        // Wsparcie powrotu na środek po zjechaniu ze strony
        document.addEventListener('mouseleave', () => {
            glowBlob.style.left = `50%`;
            glowBlob.style.top = `50%`;
        });
    }
});
