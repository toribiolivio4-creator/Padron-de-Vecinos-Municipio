function switchTab(tab) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const panel = document.getElementById(`panel-${tab}`);
    if (panel) panel.classList.add('active');

    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => {
        if (b.textContent.toLowerCase().includes(tab === 'feria' ? 'feria' : 'padrón')) {
            b.classList.add('active');
        }
    });
}
