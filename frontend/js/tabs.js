function switchTab(tab) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const panelMap = { personas: 'padron' };
    const panelId = panelMap[tab] || tab;
    const panel = document.getElementById(`panel-${panelId}`);
    if (panel) panel.classList.add('active');

    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => {
        const text = b.textContent.toLowerCase();
        if (
            (tab === 'personas' && text.includes('padrón')) ||
            (tab === 'admin' && text.includes('admin'))
        ) {
            b.classList.add('active');
        }
    });

    if (tab === 'admin') {
        cargarFormsAdmin();
    }
}
