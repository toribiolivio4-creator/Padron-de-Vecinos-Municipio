function mostrarFormularioPadron() {
    document.getElementById('vista-tabla-padron').style.display  = 'none';
    document.getElementById('vista-formulario-padron').style.display = '';
    limpiarFormPadron();
}

function volverTablaPadron() {
    document.getElementById('vista-formulario-padron').style.display = 'none';
    document.getElementById('vista-tabla-padron').style.display  = '';
    cargarPadronCompleto();
}

function editarDesdeTabla(persona) {
    mostrarFormularioPadron();
    cargarDatosEnForm(persona);
}

function limpiarFormPadron() {
    ['padron-dni','padron-apellido','padron-nombre','padron-fecha',
    'padron-telefono','padron-domicilio','padron-localidad','padron-email']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    const btnAct = document.getElementById('btn-actualizar-padron');
    const btnDel = document.getElementById('btn-eliminar-padron');
    if (btnAct) btnAct.disabled = true;
    if (btnDel) btnDel.disabled = true;

    isUpdateMode.personas = false;
    setFormStatus('');
}

function cargarDatosEnForm(p) {
    setValue('padron-dni',       p.dni);
    setValue('padron-apellido',  p.apellidos);
    setValue('padron-nombre',    p.nombres);
    (() => {
        const f = p.fecha_nacimiento ? p.fecha_nacimiento.split('T')[0] : '';
        if (f) {
            const [y,m,d] = f.split('-');
            setValue('padron-fecha', d+'/'+m+'/'+y);
        } else {
            setValue('padron-fecha', '');
        }
    })();
    setValue('padron-telefono',  p.celular);
    setValue('padron-domicilio', p.domicilio);
    setValue('padron-localidad', p.localidad);
    setValue('padron-email',     p.email);

    const btnAct = document.getElementById('btn-actualizar-padron');
    const btnDel = document.getElementById('btn-eliminar-padron');
    if (btnAct) btnAct.disabled = false;
    if (btnDel) btnDel.disabled = false;

    isUpdateMode.personas = true;
}

function formatearFecha(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length >= 5) v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4,8);
    else if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
    input.value = v;
}

function parsearFecha(str) {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
    return null;
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
        fecha_nacimiento: parsearFecha(document.getElementById('padron-fecha')?.value) || null,
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

function handleDniInputPadron(valor) {
    const dni = valor.trim();
    clearTimeout(debounceTimers.padron);

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

async function agregarPersona() {
    const datos = getFormData();
    if (!datos.dni || !datos.apellidos || !datos.nombres || !datos.fecha_nacimiento) {
        setFormStatus('⚠️ DNI, apellido, nombre y fecha de nacimiento son obligatorios.', 'error');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/personas`, {
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
