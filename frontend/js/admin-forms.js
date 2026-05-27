let adminFormsData = [];
let adminEditingForm = null;
let adminSections = [];
let editingField = null; // {sectionIdx, fieldIdx} or null
let editingSectionIdx = null; // which section is being renamed (inline)

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
    if (grid) grid.innerHTML = `<div class="table-empty">No se pudo cargar los formularios.</div>`;
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
          <span>${totalFields} campos</span>
          <span>${f.prefix}</span>
          <span>${f.model_name}</span>
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
  if (!q) { renderFormsGrid(adminFormsData); return; }
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

  document.getElementById('gf-status-badge').textContent = 'Nuevo formulario';

  document.getElementById('gf-form-title').value = '';
  document.getElementById('gf-form-desc').value = '';
  editingField = null;
  editingSectionIdx = null;

  renderQuestions();
}

function volverListaAdmin() {
  document.getElementById('vista-editor-admin').style.display = 'none';
  document.getElementById('vista-lista-admin').style.display = '';
  document.getElementById('admin-migration-status').style.display = 'none';
  editingField = null;
  editingSectionIdx = null;
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

    document.getElementById('gf-status-badge').textContent = `Editando: ${form.title}`;

    document.getElementById('gf-form-title').value = form.title;
    document.getElementById('gf-form-desc').value = form.description || '';
    editingField = null;
    editingSectionIdx = null;

    renderQuestions();
  } catch (err) {
    console.error('Error cargando formulario:', err);
    showToast('Error cargando formulario');
  }
}

// ─────────────────────────────────────────────
// Guardar
// ─────────────────────────────────────────────

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, '')
    .replace(/[\s_]+/g, '_')
    .replace(/^-+|-+$/g, '')
    .replace(/^_|_$/g, '');
}

function toPascalCase(text) {
  return text
    .replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, ' ')
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

async function guardarFormulario() {
  const title = document.getElementById('gf-form-title').value.trim();

  if (!title) {
    showToast('Completá el título del formulario');
    return;
  }

  let name, prefix, model;

  if (adminEditingForm) {
    name = adminEditingForm.name;
    prefix = adminEditingForm.prefix;
    model = adminEditingForm.model_name;
  } else {
    name = slugify(title);
    prefix = '/' + name;
    model = toPascalCase(title);
  }

  const data = {
    name,
    title,
    description: document.getElementById('gf-form-desc').value.trim() || null,
    prefix,
    tags: [],
    primary_key: 'id',
    model_name: model,
    table_name: null,
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
      showToast('Formulario guardado correctamente');
      volverListaAdmin();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(`Error: ${err.detail || res.statusText}`);
    }
  } catch (e) {
    showToast('No se pudo conectar con el servidor');
  }
}

async function eliminarFormularioAdmin(name) {
  if (!confirm(`Eliminar el formulario "${name}"? Esta acción no borra la tabla de la BD.`)) return;
  try {
    const res = await fetch(`${API_BASE}/admin/forms/${name}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Formulario eliminado');
      cargarFormsAdmin();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(`Error: ${err.detail || res.statusText}`);
    }
  } catch (e) {
    showToast('Error de conexión');
  }
}

// ─────────────────────────────────────────────
// Renderizado de preguntas (Google Forms style)
// ─────────────────────────────────────────────

function renderQuestions() {
  const container = document.getElementById('gf-questions-container');
  if (!container) return;

  if (adminSections.length === 0) {
    container.innerHTML = `
      <div class="gf-empty-state">
        <p>Empezá agregando una pregunta o sección</p>
      </div>`;
    return;
  }

  let html = '';
  adminSections.forEach((section, sIdx) => {
    html += renderSectionBlock(section, sIdx);
  });
  container.innerHTML = html;
}

function renderSectionBlock(section, sIdx) {
  const fields = section.fields || [];
  let html = '';

  html += `
    <div class="gf-section-block" data-section-idx="${sIdx}">
      <div class="gf-section-bar">
        <div class="gf-section-title-row">
          <span class="gf-section-icon">${section.icon || '📋'}</span>
          <input type="text" class="gf-section-title-input" value="${escapeHtml(section.title)}"
            placeholder="Título de la sección"
            onfocus="onSectionFocus(${sIdx})"
            onchange="onSectionTitleChange(${sIdx}, this.value)" />
          <button class="gf-section-btn" onclick="eliminarSeccion(${sIdx})" title="Eliminar sección">✕</button>
        </div>
      </div>
      <div class="gf-section-questions">`;

  fields.forEach((field, fIdx) => {
    html += renderQuestionCard(sIdx, fIdx, field);
  });

  html += `
        <div class="gf-section-add">
          <button class="gf-btn gf-btn-add-sm" onclick="agregarPreguntaASeccion(${sIdx})">+ Agregar pregunta</button>
        </div>
      </div>
    </div>`;

  return html;
}

function renderQuestionCard(sIdx, fIdx, field) {
  const isEditing = editingField && editingField.sectionIdx === sIdx && editingField.fieldIdx === fIdx;
  const typeLabel = getTypeLabel(field.type, field.frontend?.widget);
  const nameId = field.name || `campo_${sIdx}_${fIdx}`;

  return `
    <div class="gf-question-card ${isEditing ? 'gf-editing' : ''}" data-section="${sIdx}" data-field="${fIdx}">
      <div class="gf-question-main" onclick="onQuestionClick(${sIdx}, ${fIdx})">
        <div class="gf-question-drag" title="Arrastrar para reordenar">⠿</div>
        <div class="gf-question-content">
          <div class="gf-question-header-row">
            <span class="gf-question-title-display ${!field.label ? 'gf-empty-title' : ''}">
              ${escapeHtml(field.label || 'Pregunta sin título')}
            </span>
            <span class="gf-question-type-badge">${typeLabel}</span>
            ${field.required ? '<span class="gf-q-required-badge">*</span>' : ''}
          </div>
          ${renderQuestionPreview(field)}
        </div>
      </div>

      <!-- Panel de edición inline (se expande al hacer click) -->
      <div class="gf-question-edit-panel" ${isEditing ? '' : 'style="display:none;"'}>
        <div class="gf-q-edit-row">
          <div class="gf-q-edit-field gf-q-edit-field-full">
            <label>Pregunta</label>
            <input type="text" class="gf-q-input" value="${escapeHtml(field.label || '')}"
              placeholder="Escribí tu pregunta"
              onchange="onFieldLabelChange(${sIdx}, ${fIdx}, this.value)" />
          </div>
        </div>
        <div class="gf-q-edit-row">
          <div class="gf-q-edit-field">
            <label>Tipo</label>
            <select class="gf-q-select" onchange="onFieldTypeChange(${sIdx}, ${fIdx}, this.value)">
              ${renderTypeOptions(field.type, field.frontend?.widget)}
            </select>
          </div>
          <div class="gf-q-edit-field">
            <label>Nombre interno</label>
            <input type="text" class="gf-q-input" value="${escapeHtml(nameId)}"
              placeholder="ID del campo"
              onchange="onFieldNameChange(${sIdx}, ${fIdx}, this.value)" />
          </div>
        </div>
        <div class="gf-q-edit-row">
          <div class="gf-q-edit-field">
            <label>Texto de ayuda</label>
            <input type="text" class="gf-q-input" value="${escapeHtml(field.placeholder || '')}"
              placeholder="Texto de ayuda dentro del campo"
              onchange="onFieldPlaceholderChange(${sIdx}, ${fIdx}, this.value)" />
          </div>
          <div class="gf-q-edit-field">
            <label>Valor por defecto</label>
            <input type="text" class="gf-q-input" value="${escapeHtml(field.default || '')}"
              placeholder="Opcional"
              onchange="onFieldDefaultChange(${sIdx}, ${fIdx}, this.value)" />
          </div>
        </div>

        <!-- Opciones para select / checkbox -->
        ${renderFieldOptionsEditor(sIdx, fIdx, field)}

        <div class="gf-q-edit-row gf-q-edit-actions">
          <label class="gf-q-checkbox-label">
            <input type="checkbox" ${field.required ? 'checked' : ''}
              onchange="onFieldRequiredChange(${sIdx}, ${fIdx}, this.checked)" />
            Obligatorio
          </label>
          <div class="gf-q-actions-right">
            <button class="gf-btn-sm gf-btn-icon" onclick="duplicarCampo(${sIdx}, ${fIdx})" title="Duplicar">⧉</button>
            <button class="gf-btn-sm gf-btn-icon" onclick="moverCampoArriba(${sIdx}, ${fIdx})" title="Mover arriba" ${fIdx === 0 ? 'disabled' : ''}>↑</button>
            <button class="gf-btn-sm gf-btn-icon" onclick="moverCampoAbajo(${sIdx}, ${fIdx})" title="Mover abajo" ${fIdx === (adminSections[sIdx]?.fields?.length || 0) - 1 ? 'disabled' : ''}>↓</button>
            <button class="gf-btn-sm gf-btn-icon gf-btn-danger" onclick="eliminarCampo(${sIdx}, ${fIdx})" title="Eliminar">🗑</button>
            <button class="gf-btn-sm gf-btn-primary" onclick="cerrarEdicionCampo()">Listo</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderQuestionPreview(field) {
  if (field.frontend?.widget === 'select' || field.type === 'select') {
    const opts = field.frontend?.options || [];
    if (opts.length > 0) {
      return `<div class="gf-q-preview-opts">${opts.slice(0, 3).map(o => `<span class="gf-q-preview-opt">${escapeHtml(o.label || o.value)}</span>`).join('')}${opts.length > 3 ? `<span class="gf-q-preview-more">+${opts.length - 3} más</span>` : ''}</div>`;
    }
    return `<span class="gf-q-preview-placeholder">[Opciones de respuesta]</span>`;
  }
  if (field.type === 'checkbox') {
    return `<span class="gf-q-preview-placeholder">[Casillas de verificación]</span>`;
  }
  if (field.type === 'boolean') {
    return `<span class="gf-q-preview-placeholder">[Sí / No]</span>`;
  }
  if (field.type === 'text') {
    return `<div class="gf-q-preview-textarea"></div>`;
  }
  return `<div class="gf-q-preview-input"></div>`;
}

function renderFieldOptionsEditor(sIdx, fIdx, field) {
  const isSelect = field.frontend?.widget === 'select' || field.type === 'select';
  const isCheckbox = field.type === 'checkbox';
  if (!isSelect && !isCheckbox) return '';

  const options = field.frontend?.options || (field.type === 'checkbox' ? field.options : []) || [];
  const optsKey = `opts_${sIdx}_${fIdx}`;

  return `
    <div class="gf-q-edit-row gf-q-options-row">
      <div class="gf-q-edit-field gf-q-edit-field-full">
        <label>Opciones ${isCheckbox ? '(una por línea)' : ''}</label>
        <div class="gf-q-options-list" id="${optsKey}">
          ${options.map((opt, oIdx) => `
            <div class="gf-q-option-item">
              <span class="gf-q-opt-radio">${isSelect ? '○' : '☐'}</span>
              <input type="text" class="gf-q-opt-input" value="${escapeHtml(opt.label || opt.value)}"
                placeholder="Opción ${oIdx + 1}"
                onchange="onFieldOptionChange(${sIdx}, ${fIdx}, ${oIdx}, this.value)" />
              <button class="gf-q-opt-del" onclick="eliminarOpcionCampo(${sIdx}, ${fIdx}, ${oIdx})" ${options.length <= 1 ? 'disabled style="opacity:0.3"' : ''}>✕</button>
            </div>
          `).join('')}
        </div>
        <button class="gf-btn gf-btn-add-sm" onclick="agregarOpcionCampo(${sIdx}, ${fIdx})">+ Agregar opción</button>
      </div>
    </div>`;
}

function renderTypeOptions(currentType, currentWidget) {
  const types = [
    { value: 'string', label: 'Texto corto' },
    { value: 'text', label: 'Párrafo' },
    { value: 'select', label: 'Múltiple opción' },
    { value: 'checkbox', label: 'Casillas' },
    { value: 'date', label: 'Fecha' },
    { value: 'number', label: 'Número' },
    { value: 'email', label: 'Email' },
    { value: 'boolean', label: 'Sí/No' },
    { value: 'integer', label: 'Número entero' },
  ];

  const actualType = (currentWidget === 'select' || currentType === 'select') ? 'select' : currentType;
  return types.map(t =>
    `<option value="${t.value}" ${t.value === actualType ? 'selected' : ''}>${t.label}</option>`
  ).join('');
}

function getTypeLabel(type, widget) {
  const labels = {
    string: 'Texto corto',
    text: 'Párrafo',
    select: 'Múltiple opción',
    checkbox: 'Casillas',
    date: 'Fecha',
    number: 'Número',
    email: 'Email',
    boolean: 'Sí/No',
    integer: 'Número entero',
  };
  if (widget === 'select' || type === 'select') return labels.select;
  return labels[type] || type;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────
// Interacciones de preguntas
// ─────────────────────────────────────────────

function onQuestionClick(sIdx, fIdx) {
  if (editingField && editingField.sectionIdx === sIdx && editingField.fieldIdx === fIdx) {
    return; // ya está seleccionada
  }
  editingField = { sectionIdx: sIdx, fieldIdx: fIdx };
  editingSectionIdx = null;
  renderQuestions();
  // Scroll al panel de edición
  setTimeout(() => {
    const card = document.querySelector(`.gf-question-card[data-section="${sIdx}"][data-field="${fIdx}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

function cerrarEdicionCampo() {
  editingField = null;
  renderQuestions();
}

function onSectionFocus(sIdx) {
  editingField = null;
}

function onSectionTitleChange(sIdx, value) {
  adminSections[sIdx].title = value.trim() || 'Sección';
}

function onFieldLabelChange(sIdx, fIdx, value) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  adminSections[sIdx].fields[fIdx].label = value;
}

function onFieldNameChange(sIdx, fIdx, value) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  adminSections[sIdx].fields[fIdx].name = value.trim();
}

function onFieldPlaceholderChange(sIdx, fIdx, value) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  if (value.trim()) {
    adminSections[sIdx].fields[fIdx].placeholder = value.trim();
  } else {
    delete adminSections[sIdx].fields[fIdx].placeholder;
  }
}

function onFieldDefaultChange(sIdx, fIdx, value) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  if (value.trim()) {
    adminSections[sIdx].fields[fIdx].default = value.trim();
  } else {
    delete adminSections[sIdx].fields[fIdx].default;
  }
}

function onFieldRequiredChange(sIdx, fIdx, checked) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  adminSections[sIdx].fields[fIdx].required = checked;
}

function onFieldTypeChange(sIdx, fIdx, newType) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  const field = adminSections[sIdx].fields[fIdx];

  // Map user-facing types to internal types
  if (newType === 'select') {
    field.type = 'string';
    field.frontend = field.frontend || {};
    field.frontend.widget = 'select';
    if (!field.frontend.options) {
      field.frontend.options = [
        { value: 'opcion_1', label: 'Opción 1' },
        { value: 'opcion_2', label: 'Opción 2' },
      ];
    }
  } else if (newType === 'checkbox') {
    field.type = 'checkbox';
    if (field.frontend) delete field.frontend.widget;
    if (!field.options) {
      field.options = [
        { value: 'opcion_1', label: 'Opción 1' },
        { value: 'opcion_2', label: 'Opción 2' },
      ];
    }
  } else {
    field.type = newType;
    if (field.frontend) {
      delete field.frontend.widget;
      if (Object.keys(field.frontend).length === 0) delete field.frontend;
    }
    delete field.options;
  }

  renderQuestions();
}

function onFieldOptionChange(sIdx, fIdx, oIdx, value) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  const field = adminSections[sIdx].fields[fIdx];
  const isSelect = field.frontend?.widget === 'select';
  const opts = isSelect ? field.frontend.options : field.options;
  if (opts?.[oIdx]) {
    opts[oIdx].label = value.trim() || opts[oIdx].value;
  }
}

function agregarOpcionCampo(sIdx, fIdx) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  const field = adminSections[sIdx].fields[fIdx];
  const isSelect = field.frontend?.widget === 'select';
  const opts = isSelect ? field.frontend.options : field.options;
  const num = (opts?.length || 0) + 1;
  const opt = { value: `opcion_${num}`, label: `Opción ${num}` };
  if (isSelect) {
    field.frontend.options.push(opt);
  } else {
    field.options.push(opt);
  }
  renderQuestions();
}

function eliminarOpcionCampo(sIdx, fIdx, oIdx) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  const field = adminSections[sIdx].fields[fIdx];
  const isSelect = field.frontend?.widget === 'select';
  const opts = isSelect ? field.frontend.options : field.options;
  if (opts.length <= 1) return;
  opts.splice(oIdx, 1);
  renderQuestions();
}

// ─────────────────────────────────────────────
// Agregar preguntas
// ─────────────────────────────────────────────

function mostrarSelectorTipoPregunta(sectionIdx) {
  window._pendingSectionIdx = sectionIdx;
  document.getElementById('gf-type-selector').style.display = 'flex';
}

function cerrarSelectorTipo() {
  document.getElementById('gf-type-selector').style.display = 'none';
}

function crearPreguntaConTipo(type) {
  cerrarSelectorTipo();
  const sectionIdx = window._pendingSectionIdx !== undefined ? window._pendingSectionIdx : (adminSections.length > 0 ? adminSections.length - 1 : 0);
  window._pendingSectionIdx = undefined;
  createFieldInSection(sectionIdx >= 0 ? sectionIdx : 0, type);
}

function agregarPreguntaASeccion(sectionIdx) {
  mostrarSelectorTipoPregunta(sectionIdx);
}

function createFieldInSection(sectionIdx, type) {
  if (!adminSections[sectionIdx]) {
    const id = `section-${Date.now()}`;
    adminSections.push({ id, title: 'Sección ' + (adminSections.length + 1), icon: '📋', collapsed: false, fields: [] });
    sectionIdx = adminSections.length - 1;
  }

  const fieldNum = adminSections[sectionIdx].fields.length + 1;
  const name = `campo_${sectionIdx}_${fieldNum}`;

  let field = { name, label: '', type: 'string', required: false };

  if (type === 'select') {
    field.type = 'string';
    field.frontend = {
      widget: 'select',
      options: [
        { value: 'opcion_1', label: 'Opción 1' },
        { value: 'opcion_2', label: 'Opción 2' },
      ],
    };
  } else if (type === 'checkbox') {
    field.type = 'checkbox';
    field.options = [
      { value: 'opcion_1', label: 'Opción 1' },
      { value: 'opcion_2', label: 'Opción 2' },
    ];
  } else {
    field.type = type;
  }

  adminSections[sectionIdx].fields.push(field);
  const fIdx = adminSections[sectionIdx].fields.length - 1;
  editingField = { sectionIdx, fieldIdx: fIdx };
  renderQuestions();

  setTimeout(() => {
    const card = document.querySelector(`.gf-question-card[data-section="${sectionIdx}"][data-field="${fIdx}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focus the question label input
    const labelInput = card?.querySelector('.gf-q-edit-row:first-child .gf-q-input');
    if (labelInput) setTimeout(() => labelInput.focus(), 100);
  }, 100);
}

// ─────────────────────────────────────────────
// Secciones
// ─────────────────────────────────────────────

function agregarSeccion() {
  const id = `section-${Date.now()}`;
  adminSections.push({
    id, title: 'Nueva Sección', icon: '📋', collapsed: false, fields: [],
  });
  editingField = null;
  renderQuestions();
}

function eliminarSeccion(idx) {
  if (!confirm('Eliminar esta sección y todos sus campos?')) return;
  adminSections.splice(idx, 1);
  editingField = null;
  renderQuestions();
}

// ─────────────────────────────────────────────
// Duplicar, mover, eliminar campos
// ─────────────────────────────────────────────

function duplicarCampo(sIdx, fIdx) {
  if (!adminSections[sIdx]?.fields[fIdx]) return;
  const orig = adminSections[sIdx].fields[fIdx];
  const copy = JSON.parse(JSON.stringify(orig));
  copy.name = orig.name + '_copy';
  copy.label = (orig.label || 'Pregunta') + ' (copia)';
  adminSections[sIdx].fields.splice(fIdx + 1, 0, copy);
  editingField = { sectionIdx: sIdx, fieldIdx: fIdx + 1 };
  renderQuestions();
}

function moverCampoArriba(sIdx, fIdx) {
  if (fIdx <= 0 || !adminSections[sIdx]?.fields) return;
  const fields = adminSections[sIdx].fields;
  [fields[fIdx - 1], fields[fIdx]] = [fields[fIdx], fields[fIdx - 1]];
  editingField = { sectionIdx: sIdx, fieldIdx: fIdx - 1 };
  renderQuestions();
}

function moverCampoAbajo(sIdx, fIdx) {
  if (!adminSections[sIdx]?.fields || fIdx >= adminSections[sIdx].fields.length - 1) return;
  const fields = adminSections[sIdx].fields;
  [fields[fIdx], fields[fIdx + 1]] = [fields[fIdx + 1], fields[fIdx]];
  editingField = { sectionIdx: sIdx, fieldIdx: fIdx + 1 };
  renderQuestions();
}

function eliminarCampo(sIdx, fIdx) {
  if (!confirm('Eliminar esta pregunta?')) return;
  adminSections[sIdx].fields.splice(fIdx, 1);
  editingField = null;
  renderQuestions();
}

// ─────────────────────────────────────────────
// Preview, Migraciones, Generación de código
// ─────────────────────────────────────────────

// Estas funciones se mantienen del original

async function aplicarMigracion() {
  if (!adminEditingForm) {
    showToast('Guardá el formulario primero');
    return;
  }
  const btn = document.getElementById('btn-migrate');
  btn.disabled = true;
  btn.textContent = 'Migrando...';
  try {
    const res = await fetch(`${API_BASE}/admin/forms/${adminEditingForm.name}/migrate`, { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      const added = result.columns_added?.length || 0;
      showToast(`Migración aplicada: ${added} columna${added !== 1 ? 's' : ''} agregada${added !== 1 ? 's' : ''}`);
    } else {
      showToast(`Error en migración: ${result.errors?.join(', ') || 'Error desconocido'}`);
    }
    showMigrationStatus(result);
  } catch (e) {
    showToast('Error de conexión');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Migrar BD';
  }
}

async function verEstadoMigracion() {
  if (!adminEditingForm) {
    showToast('Guardá el formulario primero');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/admin/forms/${adminEditingForm.name}/migration-status`);
    const status = await res.json();
    showMigrationStatus(status);
  } catch (e) {
    showToast('Error de conexión');
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
  html += '<h4>Resultado de Migración</h4>';
  if (added.length > 0) html += `<div class="migration-success"><strong>Columnas agregadas:</strong> ${added.join(', ')}</div>`;
  if (existing.length > 0) html += `<div class="migration-info"><strong>Columnas existentes:</strong> ${existing.length} columnas</div>`;
  if (missing.length > 0) html += `<div class="migration-warning"><strong>Columnas faltantes:</strong> ${missing.map(c => `${c.name} (${c.sql_type})`).join(', ')}</div>`;
  if (errors.length > 0) html += `<div class="migration-error"><strong>Errores:</strong> ${errors.join('; ')}</div>`;
  if (!added.length && !missing.length && !errors.length) {
    html += '<div class="migration-info">Todo está sincronizado. No se requieren migraciones.</div>';
  }
  html += '</div>';
  panel.innerHTML = html;
  panel.style.display = '';
}

async function generarCodigo() {
  if (!adminEditingForm) {
    showToast('Guardá el formulario primero');
    return;
  }
  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  btn.textContent = 'Generando...';
  try {
    const res = await fetch(`${API_BASE}/admin/forms/${adminEditingForm.name}/generate`, { method: 'POST' });
    const result = await res.json();

    let html = `<p>${result.message}</p>`;
    html += '<p><strong>Archivos generados:</strong></p><ul>';
    (result.files_generated || []).forEach(f => { html += `<li><code>${f}</code></li>`; });
    html += '</ul>';
    if (result.migration_result) {
      const mr = result.migration_result;
      html += `<p><strong>Migración:</strong> ${mr.columns_added?.length || 0} columna${mr.columns_added?.length !== 1 ? 's' : ''} agregada${mr.columns_added?.length !== 1 ? 's' : ''}</p>`;
    }

    // Show in modal instead
    mostrarModalResultado(html);
    showToast('Código generado correctamente');
  } catch (e) {
    showToast('Error generando código');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generar';
  }
}

function mostrarModalResultado(html) {
  const modal = document.getElementById('modal-generacion');
  if (modal) {
    document.getElementById('generacion-result').innerHTML = html;
    modal.style.display = 'flex';
  }
}
