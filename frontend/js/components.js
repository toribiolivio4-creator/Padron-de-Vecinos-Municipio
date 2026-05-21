const API_BASE = '';

function loadComponent(id, file) {
    const el = document.getElementById(id);
    if (!el) return;
    fetch(file)
        .then(res => { if (!res.ok) throw new Error(`404: ${file}`); return res.text(); })
        .then(data => {
            el.innerHTML = data;
            if (id === 'padron') {
                renderFormulario();
                cargarPadronCompleto();
            }
        })
        .catch(err => console.warn('loadComponent error:', err));
}

loadComponent("header",  "/frontend/components/hearder.html");
loadComponent("tabs",    "/frontend/components/tabs.html");
loadComponent("feria",   "/frontend/components/feria.html");
loadComponent("padron",  "/frontend/components/padron.html");
loadComponent("footer",  "/frontend/components/footer.html");
