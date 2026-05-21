let adminFormsData = [];
let adminEditingForm = null;
let adminSections = [];
let currentSectionForCampo = null;
let _resolveModalCampo = null;
let _resolveModalGeneracion = null;

// ─────────────────────────────────────────────
// Carga inicial
// ─────────────────────────────────────────────

async function cargarFormsAdmin() {
    try {
        const res = await fetch(`${API_BASE}/admin/forms`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        adminFormsData = await res.json();
        renderFormsGrid(adminFormsData);
    } catch (err) {
        console.error('Error cargando formularios:', err);
        const grid = document.getElementById('admin-forms-grid');
        if (grid) grid.innerHTML = `<div class="table-empty">⚠️ No se pudo cargar los formularios.</div>`;
    }
}

function renderFormsGrid(forms) {
    const grid = document.getElementById('admin-forms-grid');
    const count = document.getElementById('admin-forms-count');
    if (!grid) return;

    if (count) count.textContent = `${forms.length} formulario${forms.length !== 1 ? 's' : ''}`;

    if (forms.length === 0) {
        grid.innerHTML = `<div class="table-empty">No hay formularios creados. Hacé click en "Nuevo Formulario" para empezar.</div>`;
        return;
    }

    grid.innerHTML = forms.map(f => {
        const def = JSON.parse(f.definition || '{"forms":[{}]}');
        const formData = def.forms?.[0] || {};
        const sections = formData.sections || [];
        const totalFields = sections.reduce((sum, s) => sum + (s.fields?.length || 0), 0);

        return `
        <div class="admin-form-card" onclick="editarFormulario('${f.name}')">
            <div class="admin-form-card-header">
                <h3 class="admin-form-card-title">${f.title}</h3>
                <span class="admin-form-card-badge">${sections.length} secciones</span>
            </div>
            <p class="admin-form-card-desc">${f.description || 'Sin descripción'}</p>
            <div class="admin-form-card-meta">
                <span>📋 ${totalFields} campos</span>
                <span>🔗 ${f.prefix}</span>
                <span>🗄️ ${f.model_name}</span>
            </div>
            <div class="admin-form-card-actions">
                <button class="btn-row-edit" title="Editar" onclick="event.stopPropagation(); editarFormulario('${f.name}')">✏️</button>
                <button class="btn-row-delete" title="Eliminar" onclick="event.stopPropagation(); eliminarFormularioAdmin('${f.name}')">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function filtrarFormsAdmin(valor) {
    const q = valor.trim().toLowerCase();
    if (!q) {
        renderFormsGrid(adminFormsData);
        return;
    }
    const filtrados = adminFormsData.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q) ||
        f.prefix.toLowerCase().includes(q)
    );
    renderFormsGrid(filtrados);
}

function limpiarBusquedaForms() {
    const input = document.getElementById('buscar-form-admin');
    if (input) { input.value = ''; filtrarFormsAdmin(''); }
}

// ─────────────────────────────────────────────
// Navegación
// ─────────────────────────────────────────────

function mostrarCrearFormulario() {
    adminEditingForm = null;
    adminSections = [];

    document.getElementById('vista-lista-admin').style.display = 'none';
    document.getElementById('vista-editor-admin').style.display = '';
    document.getElementById('editor-title').textContent = 'Crear Formulario';
    document.getElementById('editor-subtitle').textContent = 'Configurá las secciones y campos del formulario';

    document.getElementById('admin-form-name').value = '';
    document.getElementById('admin-form-name').readOnly = false;
    document.getElementById('admin-form-title').value = '';
    document.getElementById('admin-form-description').value = '';
    document.getElementById('admin-form-prefix').value = '';
    document.getElementById('admin-form-model').value = '';
    document.getElementById('admin-form-table').value = '';
    document.getElementById('admin-form-pk').value = 'id';

    renderAdminSections();
    updatePreview();
}

function volverListaAdmin() {
    document.getElementById('vista-editor-admin').style.display = 'none';
    document.getElementById('vista-lista-admin').style.display = '';
    document.getElementById('admin-migration-status').style.display = 'none';
    cargarFormsAdmin();
}

async function editarFormulario(name) {
    try {
        const res = await fetch(`${API_BASE}/admin/forms/${name}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const form = await res.json();

        adminEditingForm = form;
        adminSections = form.sections || [];

        document.getElementById('vista-lista-admin').style.display = 'none';
        document.getElementById('vista-editor-admin').style.display = '';
        document.getElementById('editor-title').textContent = `Editar: ${form.title}`;
        document.getElementById('editor-subtitle').textContent = `Formulario "${form.name}" — Prefijo: ${form.prefix}`;

        document.getElementById('admin-form-name').value = form.name;
        document.getElementById('admin-form-name').readOnly = true;
        document.getElementById('admin-form-title').value = form.title;
        document.getElementById('admin-form-description').value = form.description || '';
        document.getElementById('admin-form-prefix').value = form.prefix;
        document.getElementById('admin-form-model').value = form.model_name;
        document.getElementById('admin-form-table').value = form.table_name || '';
        document.getElementById('admin-form-pk').value = form.primary_key || 'id';

        renderAdminSections();
        updatePreview();
    } catch (err) {
        console.error('Error cargando formulario:', err);
        showToast('❌ Error cargando formulario');
    }
}

// ─────────────────────────────────────────────
// Guardar
// ─────────────────────────────────────────────

async function guardarFormulario() {
    const name = document.getElementById('admin-form-name').value.trim();
    const title = document.getElementById('admin-form-title').value.trim();
    const prefix = document.getElementById('admin-form-prefix').value.trim();
    const model = document.getElementById('admin-form-model').value.trim();

    if (!name || !title || !prefix || !model) {
        showToast('⚠️ Nombre, título, prefijo y modelo son obligatorios');
        return;
    }

    const data = {
        name,
        title,
        description: document.getElementById('admin-form-description').value.trim() || null,
        prefix,
        tags: [],
        primary_key: document.getElementById('admin-form-pk').value.trim() || 'id',
        model_name: model,
        table_name: document.getElementById('admin-form-table').value.trim() || null,
        sections: adminSections.map(s => ({
            id: s.id,
            title: s.title,
            icon: s.icon || '📋',
            collapsed: s.collapsed || false,
            fields: s.fields,
        })),
    };

    try {
        let res;
        if (adminEditingForm) {
            res = await fetch(`${API_BASE}/admin/forms/${name}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
        } else {
            res = await fetch(`${API_BASE}/admin/forms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
        }

        if (res.ok) {
            showToast('✅ Formulario guardado correctamente');
            volverListaAdmin();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(`❌ Error: ${err.detail || res.statusText}`);
        }
    } catch (e) {
        showToast('⚠️ No se pudo conectar con el servidor');
    }
}

async function eliminarFormularioAdmin(name) {
    if (!confirm(`¿Eliminar el formulario "${name}"? Esta acción no borra la tabla de la BD.`)) return;

    try {
        const res = await fetch(`${API_BASE}/admin/forms/${name}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('✅ Formulario eliminado');
            cargarFormsAdmin();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(`❌ Error: ${err.detail || res.statusText}`);
        }
    } catch (e) {
        showToast('⚠️ Error de conexión');
    }
}

// ─────────────────────────────────────────────
// Secciones
// ─────────────────────────────────────────────

function renderAdminSections() {
    const container = document.getElementById('admin-sections-container');
    if (!container) return;

    if (adminSections.length === 0) {
        container.innerHTML = `<p class="admin-empty-hint">No hay secciones. Agregá una para empezar.</p>`;
        return;
    }

    container.innerHTML = adminSections.map((section, sIdx) => `
        <div class="admin-section-block" data-section-idx="${sIdx}">
            <div class="admin-section-header">
                <div class="admin-section-title-row">
                    <input type="text" class="admin-section-title-input" value="${section.title}"
                        onchange="adminSections[${sIdx}].title = this.value; updatePreview();" placeholder="Título de la sección" />
                    <input type="text" class="admin-section-icon-input" value="${section.icon || '📋'}"
                        onchange="adminSections[${sIdx}].icon = this.value; updatePreview();" placeholder="Icono" style="width:50px;" />
                </div>
                <div class="admin-section-actions">
                    <label class="checkbox-label checkbox-sm">
                        <input type="checkbox" ${section.collapsed ? 'checked' : ''}
                            onchange="adminSections[${sIdx}].collapsed = this.checked" />
                        <span>Colapsada</span>
                    </label>
                    <button class="btn-icon" onclick="agregarCampoASccion(${sIdx})" title="Agregar campo">➕</button>
                    <button class="btn-icon btn-icon-danger" onclick="eliminarSeccion(${sIdx})" title="Eliminar sección">✕</button>
                </div>
            </div>
            <div class="admin-section-fields">
                ${section.fields.map((field, fIdx) => `
                    <div class="admin-field-item">
                        <span class="admin-field-type-badge">${getFieldTypeLabel(field.type)}${field.widget ? ` (${field.widget})` : ''}</span>
                        <span class="admin-field-name">${field.name}</span>
                        <span class="admin-field-label">${field.label}</span>
                        ${field.required ? '<span class="admin-field-required">*obligatorio</span>' : ''}
                        <div class="admin-field-actions">
                            <button class="btn-icon" onclick="editarCampo(${sIdx}, ${fIdx})" title="Editar">✏️</button>
                            <button class="btn-icon btn-icon-danger" onclick="eliminarCampo(${sIdx}, ${fIdx})" title="Eliminar">✕</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function agregarSeccion() {
    const id = `section-${Date.now()}`;
    adminSections.push({
        id,
        title: 'Nueva Sección',
        icon: '📋',
        collapsed: false,
        fields: [],
    });
    renderAdminSections();
    updatePreview();
}

function eliminarSeccion(idx) {
    if (!confirm('¿Eliminar esta sección y todos sus campos?')) return;
    adminSections.splice(idx, 1);
    renderAdminSections();
    updatePreview();
}

// ─────────────────────────────────────────────
// Campos
// ─────────────────────────────────────────────

function agregarCampoASccion(sectionIdx) {
    currentSectionForCampo = sectionIdx;
    resetCampoModal();
    document.getElementById('modal-campo').style.display = 'flex';
}

function resetCampoModal() {
    document.getElementById('campo-name').value = '';
    document.getElementById('campo-label').value = '';
    document.getElementById('campo-type').value = 'string';
    document.getElementById('campo-widget').value = '';
    document.getElementById('campo-placeholder').value = '';
    document.getElementById('campo-maxlength').value = '';
    document.getElementById('campo-default').value = '';
    document.getElementById('campo-required').checked = false;
    document.getElementById('campo-select-opts').value = '';
    document.getElementById('campo-validation-pattern').value = '';
    document.getElementById('campo-validation-msg').value = '';
    document.getElementById('campo-select-options').style.display = 'none';
}

function toggleCampoOptions() {
    const widget = document.getElementById('campo-widget').value;
    document.getElementById('campo-select-options').style.display = widget === 'select' ? '' : 'none';
}

function cerrarModalCampo(confirmado) {
    document.getElementById('modal-campo').style.display = 'none';
    if (!confirmado || currentSectionForCampo === null) return;

    const name = document.getElementById('campo-name').value.trim();
    const label = document.getElementById('campo-label').value.trim();
    const type = document.getElementById('campo-type').value;
    const widget = document.getElementById('campo-widget').value;

    if (!name || !label) {
        showToast('⚠️ Nombre y etiqueta son obligatorios');
        return;
    }

    const field = {
        name,
        label,
        type,
        required: document.getElementById('campo-required').checked,
    };

    const placeholder = document.getElementById('campo-placeholder').value.trim();
    if (placeholder) field.placeholder = placeholder;

    const maxLength = document.getElementById('campo-maxlength').value;
    if (maxLength) field.max_length = parseInt(maxLength);

    const defaultVal = document.getElementById('campo-default').value.trim();
    if (defaultVal) field.default = defaultVal;

    const frontend = {};

    if (widget) {
        frontend.widget = widget;
        if (widget === 'select') {
            const optsText = document.getElementById('campo-select-opts').value.trim();
            if (optsText) {
                frontend.options = optsText.split('\n').filter(l => l.trim()).map(line => {
                    const parts = line.split('|');
                    return { value: parts[0].trim(), label: parts[1]?.trim() || parts[0].trim() };
                });
            }
        }
    }

    const pattern = document.getElementById('campo-validation-pattern').value.trim();
    const msg = document.getElementById('campo-validation-msg').value.trim();
    if (pattern) {
        frontend.validation = { pattern, message: msg || 'Valor inválido' };
    }

    if (Object.keys(frontend).length > 0) {
        field.frontend = frontend;
    }

    adminSections[currentSectionForCampo].fields.push(field);
    renderAdminSections();
    updatePreview();
}

function editarCampo(sIdx, fIdx) {
    currentSectionForCampo = sIdx;
    const field = adminSections[sIdx].fields[fIdx];

    document.getElementById('campo-name').value = field.name;
    document.getElementById('campo-label').value = field.label;
    document.getElementById('campo-type').value = field.type;
    document.getElementById('campo-widget').value = field.frontend?.widget || '';
    document.getElementById('campo-placeholder').value = field.placeholder || '';
    document.getElementById('campo-maxlength').value = field.max_length || '';
    document.getElementById('campo-default').value = field.default || '';
    document.getElementById('campo-required').checked = field.required || false;

    if (field.frontend?.options) {
        document.getElementById('campo-select-opts').value = field.frontend.options.map(o => `${o.value}|${o.label}`).join('\n');
    }

    if (field.frontend?.validation) {
        document.getElementById('campo-validation-pattern').value = field.frontend.validation.pattern || '';
        document.getElementById('campo-validation-msg').value = field.frontend.validation.message || '';
    }

    toggleCampoOptions();
    document.getElementById('modal-campo').style.display = 'flex';

    document.getElementById('modal-campo').onclose = () => {
        if (currentSectionForCampo !== null) {
            adminSections[sIdx].fields.splice(fIdx, 1);
            cerrarModalCampo(true);
        }
    };
}

function eliminarCampo(sIdx, fIdx) {
    adminSections[sIdx].fields.splice(fIdx, 1);
    renderAdminSections();
    updatePreview();
}

function getFieldTypeLabel(type) {
    const labels = {
        string: 'Texto',
        email: 'Email',
        date: 'Fecha',
        boolean: 'Checkbox',
        integer: 'Entero',
        number: 'Decimal',
        text: 'Texto largo',
    };
    return labels[type] || type;
}

// ─────────────────────────────────────────────
// Preview
// ─────────────────────────────────────────────

function updatePreview() {
    const container = document.getElementById('admin-preview-content');
    if (!container) return;

    if (adminSections.length === 0) {
        container.innerHTML = `<p class="preview-placeholder">Configurá campos para ver la vista previa</p>`;
        return;
    }

    let html = '<div class="preview-form">';

    adminSections.forEach(section => {
        html += `
        <div class="preview-section">
            <h4>${section.icon || '📋'} ${section.title}</h4>
            <div class="preview-fields">`;

        section.fields.forEach(field => {
            const req = field.required ? ' <span style="color:#e74c3c;">*</span>' : '';
            let inputHtml = '';

            switch (field.type) {
                case 'boolean':
                    inputHtml = `<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" disabled /> ${field.label}</label>`;
                    break;
                case 'date':
                    inputHtml = `<input type="text" disabled placeholder="${field.placeholder || 'DD/MM/AAAA'}" class="preview-input" />`;
                    break;
                case 'email':
                    inputHtml = `<input type="email" disabled placeholder="${field.placeholder || 'correo@ejemplo.com'}" class="preview-input" />`;
                    break;
                default:
                    if (field.frontend?.widget === 'select' && field.frontend.options) {
                        inputHtml = `<select disabled class="preview-input"><option>${field.placeholder || 'Seleccionar...'}</option></select>`;
                    } else {
                        inputHtml = `<input type="text" disabled placeholder="${field.placeholder || ''}" class="preview-input" />`;
                    }
            }

            html += `
                <div class="preview-field">
                    <label>${field.label}${req}</label>
                    ${inputHtml}
                </div>`;
        });

        html += `</div></div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ─────────────────────────────────────────────
// Migraciones
// ─────────────────────────────────────────────

async function aplicarMigracion() {
    if (!adminEditingForm) {
        showToast('⚠️ Guardá el formulario primero');
        return;
    }

    const btn = document.getElementById('btn-migrate');
    btn.disabled = true;
    btn.textContent = '⏳ Migrando...';

    try {
        const res = await fetch(`${API_BASE}/admin/forms/${adminEditingForm.name}/migrate`, { method: 'POST' });
        const result = await res.json();

        if (result.success) {
            const added = result.columns_added?.length || 0;
            showToast(`✅ Migración aplicada: ${added} columna${added !== 1 ? 's' : ''} agregada${added !== 1 ? 's' : ''}`);
        } else {
            showToast(`❌ Error en migración: ${result.errors?.join(', ') || 'Error desconocido'}`);
        }

        showMigrationStatus(result);
    } catch (e) {
        showToast('⚠️ Error de conexión');
    } finally {
        btn.disabled = false;
        btn.textContent = '🗄️ Migrar BD';
    }
}

async function verEstadoMigracion() {
    if (!adminEditingForm) {
        showToast('⚠️ Guardá el formulario primero');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/forms/${adminEditingForm.name}/migration-status`);
        const status = await res.json();
        showMigrationStatus(status);
    } catch (e) {
        showToast('⚠️ Error de conexión');
    }
}

function showMigrationStatus(result) {
    const panel = document.getElementById('admin-migration-status');
    if (!panel) return;

    const added = result.columns_added || [];
    const existing = result.columns_existing || [];
    const errors = result.errors || [];
    const missing = result.missing_columns || [];

    let html = '<div class="migration-result">';
    html += `<h4>📊 Resultado de Migración</h4>`;

    if (added.length > 0) {
        html += `<div class="migration-success"><strong>✅ Columnas agregadas:</strong> ${added.join(', ')}</div>`;
    }

    if (existing.length > 0) {
        html += `<div class="migration-info"><strong>📋 Columnas existentes:</strong> ${existing.length} columnas</div>`;
    }

    if (missing.length > 0) {
        html += `<div class="migration-warning"><strong>⚠️ Columnas faltantes:</strong> ${missing.map(c => `${c.name} (${c.sql_type})`).join(', ')}</div>`;
    }

    if (errors.length > 0) {
        html += `<div class="migration-error"><strong>❌ Errores:</strong> ${errors.join('; ')}</div>`;
    }

    if (!added.length && !missing.length && !errors.length) {
        html += `<div class="migration-info">Todo está sincronizado. No se requieren migraciones.</div>`;
    }

    html += '</div>';
    panel.innerHTML = html;
    panel.style.display = '';
}

async function generarCodigo() {
    if (!adminEditingForm) {
        showToast('⚠️ Guardá el formulario primero');
        return;
    }

    const btn = document.getElementById('btn-generate');
    btn.disabled = true;
    btn.textContent = '⏳ Generando...';

    try {
        const res = await fetch(`${API_BASE}/admin/forms/${adminEditingForm.name}/generate`, { method: 'POST' });
        const result = await res.json();

        const modal = document.getElementById('modal-generacion');
        const resultDiv = document.getElementById('generacion-result');

        let html = `<p><strong>Formulario:</strong> ${result.form_name}</p>`;
        html += `<p><strong>Archivos generados:</strong></p><ul>`;
        (result.files_generated || []).forEach(f => {
            html += `<li><code>${f}</code></li>`;
        });
        html += `</ul>`;

        if (result.migration_result) {
            const mr = result.migration_result;
            html += `<p><strong>Migración:</strong> ${mr.columns_added?.length || 0} columna${mr.columns_added?.length !== 1 ? 's' : ''} agregada${mr.columns_added?.length !== 1 ? 's' : ''}</p>`;
        }

        html += `<p style="margin-top:12px; color:#666; font-size:13px;">⚠️ Para activar las rutas, agregá en <code>main.py</code>:</p>`;
        html += `<pre style="background:#f5f5f5; padding:10px; border-radius:6px; font-size:12px;">from backend.routes.auto_${adminEditingForm.name} import router as auto_${adminEditingForm.name}_router
app.include_router(auto_${adminEditingForm.name}_router)</pre>`;

        resultDiv.innerHTML = html;
        modal.style.display = 'flex';
        showToast('✅ Código generado correctamente');
    } catch (e) {
        showToast('⚠️ Error generando código');
    } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Generar Código';
    }
}
