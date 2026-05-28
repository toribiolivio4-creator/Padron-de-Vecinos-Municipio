let adminFormsData = [];
let adminEditingForm = null;
let adminSections = [];
let editingField = null;
let editingSectionIdx = null;

function initAdminEditor() {
  adminEditingForm = null;
  adminSections = [];
  editingField = null;
  editingSectionIdx = null;

  document.getElementById('gf-status-badge').textContent = 'Nuevo formulario';
  document.getElementById('gf-form-title').value = '';
  document.getElementById('gf-form-desc').value = '';
  renderQuestions();
}

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
      resetFormulario();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(`Error: ${err.detail || res.statusText}`);
    }
  } catch (e) {
    showToast('No se pudo conectar con el servidor');
  }
}

function resetFormulario() {
  adminEditingForm = null;
  adminSections = [];

  document.getElementById('gf-status-badge').textContent = 'Nuevo formulario';
  document.getElementById('gf-form-title').value = '';
  document.getElementById('gf-form-desc').value = '';
  editingField = null;
  editingSectionIdx = null;
  renderQuestions();
}

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
          <div class="gf-q-edit-field gf-q-edit-field-full">
            <label>Tipo</label>
            <select class="gf-q-select" onchange="onFieldTypeChange(${sIdx}, ${fIdx}, this.value)">
              ${renderTypeOptions(field.type, field.frontend?.widget)}
            </select>
          </div>
        </div>
        <div class="gf-q-edit-row">
          <div class="gf-q-edit-field gf-q-edit-field-full">
            <label>Placeholder</label>
            <input type="text" class="gf-q-input" value="${escapeHtml(field.placeholder || '')}"
              placeholder="Texto de ayuda dentro del campo"
              onchange="onFieldPlaceholderChange(${sIdx}, ${fIdx}, this.value)" />
          </div>
        </div>

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

function onQuestionClick(sIdx, fIdx) {
  if (editingField && editingField.sectionIdx === sIdx && editingField.fieldIdx === fIdx) {
    return;
  }
  editingField = { sectionIdx: sIdx, fieldIdx: fIdx };
  editingSectionIdx = null;
  renderQuestions();
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
  } else if (newType === 'date') {
    field.type = 'date';
    field.frontend = field.frontend || {};
    field.frontend.mask = 'date';
    delete field.options;
  } else {
    field.type = newType;
    if (field.frontend) {
      delete field.frontend.widget;
      delete field.frontend.mask;
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

function mostrarSelectorTipoPregunta(sectionIdx) {
  window._pendingSectionIdx = sectionIdx;
  document.getElementById('gf-type-selector').style.display = 'flex';
}

function cerrarSelectorTipo() {
  document.getElementById('gf-type-selector').style.display = 'none';
}

function crearPreguntaConTipo(type) {
  cerrarSelectorTipo();
  const sectionIdx = window._pendingSectionIdx !== undefined ? window._pendingSectionIdx : -1;
  window._pendingSectionIdx = undefined;
  createFieldInSection(sectionIdx, type);
}

function agregarPreguntaASeccion(sectionIdx) {
  mostrarSelectorTipoPregunta(sectionIdx);
}

function createFieldInSection(sectionIdx, type) {
  if (!adminSections[sectionIdx]) {
    const id = `section-${Date.now()}`;
    adminSections.push({ id, title: 'Pregunta ' + (adminSections.length + 1), icon: '📋', collapsed: false, fields: [] });
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
  } else if (type === 'date') {
    field.type = 'date';
    field.frontend = { mask: 'date' };
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
    const labelInput = card?.querySelector('.gf-q-edit-row:first-child .gf-q-input');
    if (labelInput) setTimeout(() => labelInput.focus(), 100);
  }, 100);
}

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
