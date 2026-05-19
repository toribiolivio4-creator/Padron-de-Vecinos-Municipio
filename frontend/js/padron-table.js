async function cargarPadronCompleto() {
    try {
        const res  = await fetch(`${API_BASE}/personas`);
        const data = await res.json();
        padronData = data;
        renderTabla(padronData);
    } catch (err) {
        console.error('Error cargando padrón:', err);
        const tbody = document.getElementById('padron-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="table-empty">⚠️ No se pudo conectar con el servidor.</td></tr>`;
    }
}

function renderTabla(filas) {
    const tbody = document.getElementById('padron-tbody');
    const count = document.getElementById('padron-count');
    if (!tbody) return;

    if (count) count.textContent = `${filas.length} registro${filas.length !== 1 ? 's' : ''}`;

    if (filas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty">No se encontraron resultados.</td></tr>`;
        return;
    }

    tbody.innerHTML = filas.map(p => `
        <tr>
            <td><span class="dni-badge">${p.dni ?? '—'}</span></td>
            <td>${p.apellidos ?? '—'}</td>
            <td>${p.nombres ?? '—'}</td>
            <td>${formatFecha(p.fecha_nacimiento)}</td>
            <td>${p.domicilio ?? '—'}</td>
            <td>${p.localidad ?? '—'}</td>
            <td>${p.celular ?? '—'}</td>
            <td>${p.email ?? '—'}</td>
            <td>
                <button class="btn-row-edit" title="Editar" onclick="editarDesdeTabla(${JSON.stringify(p).replace(/"/g, '&quot;')})">
                    ✏️
                </button>
            </td>
        </tr>
    `).join('');
}

function formatFecha(f) {
    if (!f) return '—';
    try {
        return new Date(f).toLocaleDateString('es-AR');
    } catch { return f; }
}

function filtrarPadron(valor) {
    clearTimeout(padronDebounce);
    padronDebounce = setTimeout(() => {
        const q = valor.trim();
        if (!q) {
            renderTabla(padronData);
            return;
        }
        const filtrado = padronData.filter(p =>
            String(p.dni ?? '').includes(q)
        );
        renderTabla(filtrado);
    }, 200);
}

function limpiarBusquedaPadron() {
    const input = document.getElementById('buscar-dni-padron');
    if (input) { input.value = ''; filtrarPadron(''); }
}
