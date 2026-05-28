let activeSortMenu = null;
let activeFilterMenu = null;

function cerrarSortMenu() {
    if (activeSortMenu) {
        activeSortMenu.remove();
        activeSortMenu = null;
    }
}

function cerrarFilterMenu() {
    if (activeFilterMenu) {
        activeFilterMenu.remove();
        activeFilterMenu = null;
    }
}

function toggleSortMenu(event, column) {
    event.stopPropagation();
    cerrarSortMenu();
    cerrarFilterMenu();

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

document.addEventListener('click', () => {
    cerrarSortMenu();
    cerrarFilterMenu();
});

function toggleFilter(event, field, label) {
    event.stopPropagation();
    cerrarFilterMenu();
    cerrarSortMenu();

    const th = event.currentTarget.closest('th');
    const rect = th.getBoundingClientRect();

    const filterValue = field === 'localidad' ? localidadFilter : domicilioFilter;

    const menu = document.createElement('div');
    menu.className = 'filter-dropdown';
    menu.style.top = rect.bottom + 'px';
    menu.style.left = Math.max(10, rect.left) + 'px';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'filter-input';
    input.placeholder = `Filtrar por ${label}...`;
    input.value = filterValue || '';
    input.oninput = function (e) {
        e.stopPropagation();
        aplicarFilter(field, this.value);
    };
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') cerrarFilterMenu();
    });

    const clearBtn = document.createElement('button');
    clearBtn.className = 'filter-clear-btn';
    clearBtn.textContent = '✕';
    clearBtn.onclick = function (e) {
        e.stopPropagation();
        input.value = '';
        aplicarFilter(field, '');
        input.focus();
    };

    menu.appendChild(input);
    menu.appendChild(clearBtn);
    menu.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(menu);
    activeFilterMenu = menu;

    setTimeout(() => input.focus(), 50);
}

function toggleFilterEdad(event) {
    event.stopPropagation();
    cerrarFilterMenu();
    cerrarSortMenu();

    const th = event.currentTarget.closest('th');
    const rect = th.getBoundingClientRect();

    const menu = document.createElement('div');
    menu.className = 'filter-dropdown';
    menu.style.top = rect.bottom + 'px';
    menu.style.left = Math.max(10, rect.left) + 'px';
    menu.style.padding = '8px';
    menu.style.gap = '6px';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';

    const select = document.createElement('select');
    select.className = 'filter-input';
    select.style.width = '100%';
    select.innerHTML = `
        <option value="">— Filtrar por edad —</option>
        <option value="mayor" ${edadFilter.mode === 'mayor' ? 'selected' : ''}>Mayores de</option>
        <option value="menor" ${edadFilter.mode === 'menor' ? 'selected' : ''}>Menores de</option>
    `;

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'filter-input';
    input.placeholder = 'Edad...';
    input.min = 0;
    input.max = 150;
    input.value = edadFilter.value || '';
    input.style.width = '100%';

    const apply = () => {
        const mode = select.value;
        const val = parseInt(input.value, 10);
        if (mode && val > 0) {
            edadFilter = { mode, value: val };
        } else {
            edadFilter = { mode: '', value: 0 };
        }
        aplicarFiltrosCombinados();
        renderFilterIndicator();
    };

    select.onchange = (e) => { e.stopPropagation(); apply(); };
    input.oninput = (e) => { e.stopPropagation(); };
    input.onchange = (e) => { e.stopPropagation(); apply(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarFilterMenu(); });

    const clearBtn = document.createElement('button');
    clearBtn.className = 'filter-clear-btn';
    clearBtn.textContent = '✕';
    clearBtn.onclick = (e) => {
        e.stopPropagation();
        select.value = '';
        input.value = '';
        edadFilter = { mode: '', value: 0 };
        aplicarFiltrosCombinados();
        renderFilterIndicator();
        input.focus();
    };

    menu.appendChild(select);
    menu.appendChild(input);
    menu.appendChild(clearBtn);
    menu.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(menu);
    activeFilterMenu = menu;
}

function calcularEdad(fechaStr) {
    if (!fechaStr) return null;
    const nac = new Date(fechaStr);
    if (isNaN(nac)) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
}

function aplicarFilter(field, valor) {
    const val = valor.trim().toLowerCase();
    if (field === 'localidad') localidadFilter = val;
    else if (field === 'domicilio') domicilioFilter = val;
    else if (field === 'celular') celularFilter = val;
    aplicarFiltrosCombinados();
    renderFilterIndicator();
}

function renderFilterIndicator() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const field = btn.dataset.field;
        let active = false;
        if (field === 'localidad') active = !!localidadFilter;
        else if (field === 'domicilio') active = !!domicilioFilter;
        else if (field === 'celular') active = !!celularFilter;
        else if (field === 'fecha_nacimiento') active = !!edadFilter.mode;
        btn.classList.toggle('filter-active', active);
    });
}

function aplicarFiltrosCombinados() {
    let data = [...padronData];

    if (localidadFilter) {
        data = data.filter(p => String(p.localidad ?? '').toLowerCase().includes(localidadFilter));
    }

    if (domicilioFilter) {
        data = data.filter(p => String(p.domicilio ?? '').toLowerCase().includes(domicilioFilter));
    }

    if (celularFilter) {
        data = data.filter(p => String(p.celular ?? '').toLowerCase().includes(celularFilter));
    }

    if (edadFilter.mode) {
        data = data.filter(p => {
            const edad = calcularEdad(p.fecha_nacimiento);
            if (edad === null) return false;
            return edadFilter.mode === 'mayor' ? edad >= edadFilter.value : edad <= edadFilter.value;
        });
    }

    const input = document.getElementById('buscar-padron');
    const q = input ? input.value.trim().toLowerCase() : '';
    if (q) {
        const col = getSearchColumn();
        data = data.filter(p => String(p[col] ?? '').toLowerCase().includes(q));
    }

    renderTabla(data);
}

function ordenarTabla(column, direction) {
    sortState.column = column;
    sortState.direction = direction;

    let data = [...padronData];

    if (localidadFilter) {
        data = data.filter(p => String(p.localidad ?? '').toLowerCase().includes(localidadFilter));
    }

    if (domicilioFilter) {
        data = data.filter(p => String(p.domicilio ?? '').toLowerCase().includes(domicilioFilter));
    }

    if (celularFilter) {
        data = data.filter(p => String(p.celular ?? '').toLowerCase().includes(celularFilter));
    }

    if (edadFilter.mode) {
        data = data.filter(p => {
            const edad = calcularEdad(p.fecha_nacimiento);
            if (edad === null) return false;
            return edadFilter.mode === 'mayor' ? edad >= edadFilter.value : edad <= edadFilter.value;
        });
    }

    const input = document.getElementById('buscar-padron');
    const q = input ? input.value.trim().toLowerCase() : '';
    if (q) {
        const col = getSearchColumn();
        data = data.filter(p => String(p[col] ?? '').toLowerCase().includes(q));
    }

    data.sort((a, b) => {
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

    renderTabla(data);
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
        renderFilterIndicator();
        aplicarFiltrosCombinados();
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
        aplicarFiltrosCombinados();
    }, 200);
}

function limpiarBusquedaPadron() {
    const input = document.getElementById('buscar-padron');
    if (input) { input.value = ''; filtrarPadron(''); }
}
