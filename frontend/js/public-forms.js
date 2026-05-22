let publicFormsData = [];
let currentPublicForm = null;

async function cargarFormulariosPublicos() {
    try {
        const res = await fetch(`${API_BASE}/admin/forms`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        publicFormsData = await res.json();
        renderPublicFormsGrid(publicFormsData);
    } catch (err) {
        const grid = document.getElementById('public-forms-grid');
        if (grid) grid.innerHTML = `<div class="table-empty">No se pudieron cargar los formularios.</div>`;
    }
}

function renderPublicFormsGrid(forms) {
    const grid = document.getElementById('public-forms-grid');
    if (!grid) return;

    const activos = forms.filter(f => f.activo !== false);
    if (activos.length === 0) {
        grid.innerHTML = `<div class="table-empty">No hay formularios públicos disponibles.</div>`;
        return;
    }

    grid.innerHTML = activos.map(f => {
        const def = JSON.parse(f.definition || '{"forms":[{}]}');
        const formData = def.forms?.[0] || {};
        const sections = formData.sections || [];
        const totalFields = sections.reduce((sum, s) => sum + (s.fields?.length || 0), 0);

        return `
        <div class="admin-form-card" onclick="abrirFormularioPublico('${f.name}')">
            <div class="admin-form-card-header">
                <h3 class="admin-form-card-title">${formData.title || f.title}</h3>
                <span class="admin-form-card-badge">${sections.length} secciones</span>
            </div>
            <p class="admin-form-card-desc">${formData.description || f.description || 'Completá el formulario'}</p>
            <div class="admin-form-card-meta">
                <span>📋 ${totalFields} campos</span>
            </div>
        </div>`;
    }).join('');
}

function abrirFormularioPublico(name) {
    const form = publicFormsData.find(f => f.name === name);
    if (!form) return;

    currentPublicForm = form;
    const def = JSON.parse(form.definition);
    const formData = def.forms?.[0] || {};

    document.getElementById('public-forms-list').style.display = 'none';
    document.getElementById('public-form-view').style.display = '';
    document.getElementById('public-form-title').textContent = formData.title || form.title;
    document.getElementById('public-form-desc').textContent = formData.description || '';
    document.getElementById('public-form-status').textContent = '';
    document.getElementById('public-form-status').className = 'form-status';

    renderPublicForm(formData);
}

function volverListaPublica() {
    document.getElementById('public-form-view').style.display = 'none';
    document.getElementById('public-forms-list').style.display = '';
    document.getElementById('modal-public-success').style.display = 'none';
    cargarFormulariosPublicos();
}

function renderPublicForm(formData) {
    const container = document.getElementById('public-form-dinamico');
    if (!container) return;

    const sections = formData.sections || [];
    let html = '';

    sections.forEach((section) => {
        html += `
        <div class="form-section">
            <div class="form-section-header">
                <h3 class="form-section-title">
                    <span class="form-section-icon">${section.icon || '📋'}</span>
                    ${section.title}
                </h3>
            </div>
            <div class="form-section-body">
                <div class="form-row-group">`;

        (section.fields || []).forEach((field) => {
            const fe = field.frontend || {};
            const requiredMark = field.required ? ' <span class="required-star">*</span>' : '';
            const fieldId = `pub-${field.name}`;

            if (field.type === 'boolean') {
                html += `
                <div class="form-group form-checkbox-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="${fieldId}" data-field="${field.name}" ${field.default ? 'checked' : ''} />
                        <span class="checkbox-text">${field.label}${requiredMark}</span>
                    </label>
                    <div class="field-error" id="error-${fieldId}"></div>
                </div>`;
            } else if (field.type === 'date') {
                html += `
                <div class="form-group">
                    <label class="form-label" for="${fieldId}">${field.label}${requiredMark}</label>
                    <input type="date" id="${fieldId}" class="form-input"
                        ${field.required ? 'required' : ''}
                        data-field="${field.name}" />
                    <div class="field-error" id="error-${fieldId}"></div>
                </div>`;
            } else if (fe.widget === 'select' && fe.options) {
                const opts = (fe.options || []).map(o =>
                    `<option value="${o.value}" ${o.value === field.default ? 'selected' : ''}>${o.label}</option>`
                ).join('');
                html += `
                <div class="form-group">
                    <label class="form-label" for="${fieldId}">${field.label}${requiredMark}</label>
                    <select id="${fieldId}" class="form-input" data-field="${field.name}">
                        <option value="">— Seleccionar —</option>
                        ${opts}
                    </select>
                    <div class="field-error" id="error-${fieldId}"></div>
                </div>`;
            } else {
                const inputType = field.type === 'email' ? 'email' : field.type === 'integer' || field.type === 'number' ? 'number' : 'text';
                html += `
                <div class="form-group">
                    <label class="form-label" for="${fieldId}">${field.label}${requiredMark}</label>
                    <input type="${inputType}" id="${fieldId}" class="form-input"
                        placeholder="${field.placeholder || ''}"
                        ${field.max_length ? `maxlength="${field.max_length}"` : ''}
                        ${field.required ? 'required' : ''}
                        data-field="${field.name}" />
                    <div class="field-error" id="error-${fieldId}"></div>
                </div>`;
            }
        });

        html += `
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function getPublicFormData() {
    const form = currentPublicForm;
    if (!form) return null;

    const def = JSON.parse(form.definition);
    const formData = def.forms?.[0] || {};
    const data = {};

    (formData.sections || []).forEach((section) => {
        (section.fields || []).forEach((field) => {
            const el = document.getElementById(`pub-${field.name}`);
            if (!el) return;

            if (field.type === 'boolean') {
                data[field.name] = el.checked;
            } else if (field.type === 'integer') {
                const val = el.value.trim();
                data[field.name] = val === '' ? null : parseInt(val);
            } else if (field.type === 'number') {
                const val = el.value.trim();
                data[field.name] = val === '' ? null : parseFloat(val);
            } else if (field.type === 'date') {
                data[field.name] = el.value || null;
            } else {
                const val = el.value.trim();
                data[field.name] = val === '' ? null : val;
            }
        });
    });

    return data;
}

function validarPublicForm() {
    const form = currentPublicForm;
    if (!form) return false;

    const def = JSON.parse(form.definition);
    const formData = def.forms?.[0] || {};
    let valid = true;

    (formData.sections || []).forEach((section) => {
        (section.fields || []).forEach((field) => {
            const el = document.getElementById(`pub-${field.name}`);
            if (!el) return;
            const errorEl = document.getElementById(`error-pub-${field.name}`);

            let val;
            if (field.type === 'boolean') {
                val = el.checked;
            } else {
                val = el.value.trim();
            }

            if (field.required && !val) {
                if (errorEl) errorEl.textContent = `${field.label} es obligatorio`;
                el.classList.add('input-error');
                valid = false;
            } else {
                if (errorEl) errorEl.textContent = '';
                el.classList.remove('input-error');
            }
        });
    });

    return valid;
}

async function enviarFormularioPublico() {
    if (!currentPublicForm) return;

    const statusEl = document.getElementById('public-form-status');
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    if (!validarPublicForm()) {
        statusEl.textContent = '⚠️ Corregí los errores antes de continuar.';
        statusEl.className = 'form-status error';
        return;
    }

    const data = getPublicFormData();
    if (!data) return;

    try {
        const res = await fetch(`${API_BASE}/api/public/forms/${currentPublicForm.name}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
        });

        if (res.ok) {
            document.getElementById('modal-public-success').style.display = 'flex';
            statusEl.textContent = '';
        } else {
            const err = await res.json().catch(() => ({}));
            statusEl.textContent = `❌ Error: ${err.detail || 'Error del servidor'}`;
            statusEl.className = 'form-status error';
        }
    } catch (e) {
        statusEl.textContent = '⚠️ No se pudo conectar con el servidor.';
        statusEl.className = 'form-status error';
    }
}
