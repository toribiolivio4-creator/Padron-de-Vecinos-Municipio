let activeSortMenu = null;

function cerrarSortMenu() {
    if (activeSortMenu) {
        activeSortMenu.remove();
        activeSortMenu = null;
    }
}

function toggleSortMenu(event, column) {
    event.stopPropagation();
    cerrarSortMenu();

    const th = event.currentTarget;
    const rect = th.getBoundingClientRect();

    const isDni = column === 'dni';

    const menu = document.createElement('div');
    menu.className = 'sort-dropdown';
    menu.style.top = rect.bottom + 'px';
    menu.style.left = rect.left + 'px';

    const asc = document.createElement('div');
    asc.className = 'sort-option' + (sortState.column === column && sortState.direction === 'asc' ? ' sort-active' : '');
    asc.textContent = isDni ? '↑ Ascendente' : '↑ A-Z';
    asc.onclick = (e) => { e.stopPropagation(); ordenarTabla(column, 'asc'); cerrarSortMenu(); };

    const desc = document.createElement('div');
    desc.className = 'sort-option' + (sortState.column === column && sortState.direction === 'desc' ? ' sort-active' : '');
    desc.textContent = isDni ? '↓ Descendente' : '↓ Z-A';
    desc.onclick = (e) => { e.stopPropagation(); ordenarTabla(column, 'desc'); cerrarSortMenu(); };

    menu.appendChild(asc);
    menu.appendChild(desc);
    document.body.appendChild(menu);
    activeSortMenu = menu;
}

document.addEventListener('click', cerrarSortMenu);

function ordenarTabla(column, direction) {
    sortState.column = column;
    sortState.direction = direction;

    const sorted = [...padronData].sort((a, b) => {
        const va = (a[column] ?? '').toString().toLowerCase();
        const vb = (b[column] ?? '').toString().toLowerCase();
        if (column === 'fecha_nacimiento') {
            const da = va ? new Date(va) : 0;
            const db = vb ? new Date(vb) : 0;
            return direction === 'asc' ? da - db : db - da;
        }
        if (direction === 'asc') return va.localeCompare(vb);
        return vb.localeCompare(va);
    });

    renderTabla(sorted);
}

function renderSortIndicators() {
    document.querySelectorAll('.sortable-th').forEach(th => {
        const arrow = th.querySelector('.sort-arrow');
        const col = th.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (arrow) {
            if (sortState.column === col) {
                arrow.textContent = sortState.direction === 'asc' ? '↑' : '↓';
                th.classList.add('sort-active-th');
            } else {
                arrow.textContent = '▾';
                th.classList.remove('sort-active-th');
            }
        }
    });
}

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

    renderSortIndicators();
}

function formatFecha(f) {
    if (!f) return '—';
    try {
        return new Date(f).toLocaleDateString('es-AR');
    } catch { return f; }
}

function getSearchColumn() {
    const sel = document.getElementById('search-column-select');
    return sel ? sel.value : 'dni';
}

function cambiarColumnaBusqueda() {
    const col = getSearchColumn();
    const labels = {
        dni: 'DNI',
        apellidos: 'Apellido',
        nombres: 'Nombre',
        fecha_nacimiento: 'Fecha Nac.',
        domicilio: 'Domicilio',
        localidad: 'Localidad',
        celular: 'Teléfono',
        email: 'Email',
    };
    const input = document.getElementById('buscar-padron');
    if (input) input.placeholder = `Buscar por ${labels[col] || col}...`;
    const val = input ? input.value : '';
    if (val) filtrarPadron(val);
}

function filtrarPadron(valor) {
    clearTimeout(padronDebounce);
    padronDebounce = setTimeout(() => {
        const q = valor.trim().toLowerCase();
        const col = getSearchColumn();
        if (!q) {
            renderTabla(padronData);
            return;
        }
        const filtrado = padronData.filter(p =>
            String(p[col] ?? '').toLowerCase().includes(q)
        );
        renderTabla(filtrado);
    }, 200);
}

function limpiarBusquedaPadron() {
    const input = document.getElementById('buscar-padron');
    if (input) { input.value = ''; filtrarPadron(''); }
}
