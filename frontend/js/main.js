const API_BASE = 'http://127.0.0.1:8080';

// =============================================
// 🔥 CARGADOR DE COMPONENTES
// =============================================
function loadComponent(id, file) {
    fetch(file)
        .then(res => res.text())
        .then(data => {
            document.getElementById(id).innerHTML = data;
            if (id === 'padron') {
                cargarPadronCompleto();
            }
        });
}

// Cargar todo
loadComponent("header",  "/frontend/components/hearder.html");
loadComponent("tabs",    "/frontend/components/tabs.html");
loadComponent("feria",   "/frontend/components/feria.html");
loadComponent("padron",  "/frontend/components/padron.html");
loadComponent("footer",  "/frontend/components/footer.html");


// =============================================
// 🗂️ ESTADO GLOBAL
// =============================================
let debounceTimers = {};
let isUpdateMode   = { feria: false, padron: false };
let padronData     = [];         // todos los registros activos cacheados
let padronDebounce = null;


// =============================================
// 📋 TABS
// =============================================
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


// =============================================
// 📊 PADRÓN — CARGA DE TABLA COMPLETA
// =============================================
async function cargarPadronCompleto() {
    try {
        const res  = await fetch(`${API_BASE}/personas`);
        const data = await res.json();
        // Solo activos (soft delete: active === true o deleted_at === null)
        padronData = data.filter(p => p.active !== false && !p.deleted_at);
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


// =============================================
// 🔍 BUSCADOR EN TIEMPO REAL (por DNI)
// =============================================
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


// =============================================
// 🔀 NAVEGACIÓN ENTRE VISTA-TABLA Y VISTA-FORM
// =============================================
function mostrarFormularioPadron() {
    document.getElementById('vista-tabla-padron').style.display  = 'none';
    document.getElementById('vista-formulario-padron').style.display = '';
    limpiarFormPadron();
}

function volverTablaPadron() {
    document.getElementById('vista-formulario-padron').style.display = 'none';
    document.getElementById('vista-tabla-padron').style.display  = '';
    cargarPadronCompleto();   // refresca la tabla al volver
}

// Editar desde la fila de la tabla: va al form con datos precargados
function editarDesdeTabla(persona) {
    mostrarFormularioPadron();
    cargarDatosEnForm(persona);
}


// =============================================
// 📝 FORMULARIO DE PADRÓN — helpers
// =============================================
function limpiarFormPadron() {
    ['padron-dni','padron-apellido','padron-nombre','padron-fecha',
    'padron-telefono','padron-domicilio','padron-localidad','padron-email']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    const btnAct = document.getElementById('btn-actualizar-padron');
    const btnDel = document.getElementById('btn-eliminar-padron');
    if (btnAct) btnAct.disabled = true;
    if (btnDel) btnDel.disabled = true;

    isUpdateMode.padron = false;
    setFormStatus('');
}

function cargarDatosEnForm(p) {
    setValue('padron-dni',       p.dni);
    setValue('padron-apellido',  p.apellidos);   // ← apellidos
    setValue('padron-nombre',    p.nombres);     // ← nombres
    setValue('padron-fecha',     p.fecha_nacimiento ? p.fecha_nacimiento.split('T')[0] : '');
    setValue('padron-telefono',  p.celular);     // ← celular
    setValue('padron-domicilio', p.domicilio);
    setValue('padron-localidad', p.localidad);
    setValue('padron-email',     p.email);



    const btnAct = document.getElementById('btn-actualizar-padron');
    const btnDel = document.getElementById('btn-eliminar-padron');
    if (btnAct) btnAct.disabled = false;
    if (btnDel) btnDel.disabled = false;

    isUpdateMode.padron = true;
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
}

function getFormData() {
    return {
        dni:              document.getElementById('padron-dni')?.value.trim(),
        apellidos:        document.getElementById('padron-apellido')?.value.trim(),
        nombres:          document.getElementById('padron-nombre')?.value.trim(),
        fecha_nacimiento: document.getElementById('padron-fecha')?.value || null,
        celular:          document.getElementById('padron-telefono')?.value.trim(),
        domicilio:        document.getElementById('padron-domicilio')?.value.trim(),
        localidad:        document.getElementById('padron-localidad')?.value.trim(),
        email:            document.getElementById('padron-email')?.value.trim() || null,
        sexo:             document.getElementById('padron-sexo')?.value || null,
        ocupacion:        document.getElementById('padron-ocupacion')?.value.trim() || null,
        nivel_estudios:   document.getElementById('padron-estudios')?.value || 'No especificado',
        jubilado:         document.getElementById('padron-jubilado')?.checked ?? false,
        pensionado:       document.getElementById('padron-pensionado')?.checked ?? false,
    };
}

function setFormStatus(msg, tipo = '') {
    const el = document.getElementById('padron-form-status');
    if (!el) return;
    el.textContent  = msg;
    el.className    = `form-status ${tipo}`;
}


// =============================================
// 🔎 BUSCAR POR DNI AL TIPEAR EN EL FORMULARIO
// =============================================
function handleDniInputPadron(valor) {
    const dni = valor.trim();
    clearTimeout(debounceTimers.padron);

    // Reset botones si se borra el DNI
    if (!dni) {
        document.getElementById('btn-actualizar-padron').disabled = true;
        document.getElementById('btn-eliminar-padron').disabled   = true;
        isUpdateMode.padron = false;
        return;
    }

    if (dni.length < 7) return;

    debounceTimers.padron = setTimeout(async () => {
        try {
            const res = await fetch(`${API_BASE}/personas/${dni}`);
            if (res.ok) {
                const p = await res.json();
                cargarDatosEnForm(p);
                setFormStatus('✅ Persona encontrada. Podés actualizar o eliminar.', 'success');
            } else {
                // DNI no existe → modo agregar
                document.getElementById('btn-actualizar-padron').disabled = true;
                document.getElementById('btn-eliminar-padron').disabled   = true;
                isUpdateMode.padron = false;
                setFormStatus('ℹ️ DNI no registrado. Completá los datos para agregar.', 'info');
            }
        } catch (err) {
            setFormStatus('⚠️ Error al consultar el servidor.', 'error');
        }
    }, 400);
}


// =============================================
// ➕ AGREGAR PERSONA
// =============================================
async function agregarPersona() {
    const datos = getFormData();
    if (!datos.dni || !datos.apellidos || !datos.nombres) {
        setFormStatus('⚠️ DNI, apellido y nombre son obligatorios.', 'error');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/padron-vecinos/`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(datos),
        });
        if (res.ok) {
            setFormStatus('✅ Persona agregada correctamente.', 'success');
            limpiarFormPadron();
            showToast('✅ Persona agregada.');
        } else {
            const err = await res.json().catch(() => ({}));
            setFormStatus(`❌ Error: ${err.detail ?? res.statusText}`, 'error');
        }
    } catch (e) {
        setFormStatus('⚠️ No se pudo conectar con el servidor.', 'error');
    }
}


// =============================================
// 🔄 ACTUALIZAR PERSONA
// =============================================
async function actualizarPersona() {
    const datos = getFormData();
    if (!datos.dni) { setFormStatus('⚠️ Ingresá un DNI.', 'error'); return; }
    try {
        const res = await fetch(`${API_BASE}/personas/${datos.dni}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(datos),
        });
        if (res.ok) {
            setFormStatus('✅ Datos actualizados correctamente.', 'success');
            limpiarFormPadron();
            showToast('✅ Datos actualizados.');
        } else {
            const err = await res.json().catch(() => ({}));
            setFormStatus(`❌ Error: ${err.detail ?? res.statusText}`, 'error');
        }
    } catch (e) {
        setFormStatus('⚠️ No se pudo conectar con el servidor.', 'error');
    }
}


// =============================================
// 🗑️ SOFT DELETE — ELIMINAR PERSONA
// =============================================
let _resolveModal = null;

function abrirModal(dni) {
    document.getElementById('modal-mensaje').textContent =
        `¿Estás seguro que querés eliminar el registro de DNI ${dni}? Esta acción lo ocultará del padrón pero no borrará el registro de la base de datos.`;
    const modal = document.getElementById('modal-confirmar');
    modal.style.display = 'flex';
    return new Promise(resolve => { _resolveModal = resolve; });
}

function cerrarModal(confirmado) {
    document.getElementById('modal-confirmar').style.display = 'none';
    if (_resolveModal) { _resolveModal(confirmado); _resolveModal = null; }
}

async function eliminarPersona() {
    const datos = getFormData();
    if (!datos.dni) { setFormStatus('⚠️ Ingresá un DNI.', 'error'); return; }

    const confirmado = await abrirModal(datos.dni);
    if (!confirmado) return;

    try {
        const res = await fetch(`${API_BASE}/personas/${datos.dni}/baja`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ active: false }),
        });
        if (res.ok) {
            setFormStatus('✅ Registro eliminado del padrón (soft delete).', 'success');
            limpiarFormPadron();
            showToast('🗑️ Registro dado de baja.');
        } else {
            const err = await res.json().catch(() => ({}));
            setFormStatus(`❌ Error: ${err.detail ?? res.statusText}`, 'error');
        }
    } catch (e) {
        setFormStatus('⚠️ No se pudo conectar con el servidor.', 'error');
    }
}

// =============================================
// 🎉 TOAST NOTIFICATIONS
// =============================================
function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}



