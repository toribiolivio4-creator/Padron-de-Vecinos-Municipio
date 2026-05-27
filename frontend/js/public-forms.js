let publicFormsData = [];
let currentPublicForm = null;

async function cargarPublicForms() {
  try {
    const res = await fetch(`${API_BASE}/admin/forms`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    publicFormsData = await res.json();
    renderPublicFormsGrid(publicFormsData);
  } catch (err) {
    console.error('Error cargando formularios:', err);
    const grid = document.getElementById('public-forms-grid');
    if (grid) grid.innerHTML = `<div class="table-empty">No se pudieron cargar los formularios.</div>`;
  }
}

function renderPublicFormsGrid(forms) {
  const grid = document.getElementById('public-forms-grid');
  if (!grid) return;

  if (forms.length === 0) {
    grid.innerHTML = `<div class="table-empty">No hay formularios disponibles.</div>`;
    return;
  }

  grid.innerHTML = forms.map(f => {
    const def = JSON.parse(f.definition || '{"forms":[{}]}');
    const formData = def.forms?.[0] || {};
    const sections = formData.sections || [];
    const totalFields = sections.reduce((sum, s) => sum + (s.fields?.length || 0), 0);

    return `
      <div class="admin-form-card" onclick="abrirFormularioPublico('${f.name}')">
        <div class="admin-form-card-header">
          <h3 class="admin-form-card-title">${f.title}</h3>
          <span class="admin-form-card-badge">${sections.length} secciones</span>
        </div>
        <p class="admin-form-card-desc">${f.description || 'Sin descripción'}</p>
        <div class="admin-form-card-meta">
          <span>${totalFields} campos</span>
        </div>
      </div>`;
  }).join('');
}

async function abrirFormularioPublico(name) {
  try {
    const res = await fetch(`${API_BASE}/admin/forms/${name}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    currentPublicForm = await res.json();

    document.getElementById('vista-lista-public-forms').style.display = 'none';
    document.getElementById('vista-formulario-publico').style.display = '';

    document.getElementById('public-form-title').textContent = currentPublicForm.title;
    document.getElementById('public-form-desc').textContent = currentPublicForm.description || '';

    renderPublicForm();
  } catch (err) {
    console.error('Error cargando formulario:', err);
    showToast('Error al cargar el formulario');
  }
}

function volverListaPublicForms() {
  document.getElementById('vista-formulario-publico').style.display = 'none';
  document.getElementById('vista-lista-public-forms').style.display = '';
  cargarPublicForms();
}

function renderPublicForm() {
  const container = document.getElementById('public-form-dinamico');
  if (!container || !currentPublicForm) return;

  const sections = currentPublicForm.sections || [];
  if (sections.length === 0) {
    container.innerHTML = '<p>Este formulario no tiene secciones.</p>';
    return;
  }

  let html = '';
  sections.forEach((section) => {
    const collapsedClass = section.collapsed ? ' section-collapsed' : '';
    html += `
      <div class="form-section${collapsedClass}" id="pub-section-${section.id}">
        <div class="form-section-header" onclick="togglePubSection('${section.id}')">
          <h3 class="form-section-title">
            <span class="form-section-icon">${section.icon || '📋'}</span>
            ${section.title}
          </h3>
          <span class="form-section-toggle" id="pub-toggle-${section.id}">
            ${section.collapsed ? '▶' : '▼'}
          </span>
        </div>
        <div class="form-section-body" id="pub-section-body-${section.id}" ${section.collapsed ? 'style="display:none;"' : ''}>
          <div class="form-row-group">`;

    (section.fields || []).forEach((field) => {
      html += renderPublicField(field);
    });

    html += `
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html;
  attachPublicFieldListeners();
}

function renderPublicField(field) {
  const requiredMark = field.required ? ' <span class="required-star">*</span>' : '';
  const fe = field.frontend || {};
  const widget = fe.widget || '';

  let inputHtml = '';

  if (field.type === 'boolean') {
    inputHtml = `
      <label class="checkbox-label">
        <input type="checkbox" id="pub-field-${field.name}" data-field="${field.name}" />
        <span class="checkbox-text">${field.label}</span>
      </label>`;
    return `
      <div class="form-group form-checkbox-group" id="pub-group-${field.name}">
        ${inputHtml}
        <div class="field-error" id="pub-error-${field.name}"></div>
      </div>`;
  }

  switch (widget) {
    case 'select':
      const options = (fe.options || []).map((opt) =>
        `<option value="${opt.value}" ${opt.value === field.default ? 'selected' : ''}>${opt.label}</option>`
      ).join('');
      inputHtml = `
        <select id="pub-field-${field.name}" class="form-input" data-field="${field.name}">
          ${options}
        </select>`;
      break;
    default:
      inputHtml = `
        <input type="${field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}"
          id="pub-field-${field.name}" class="form-input"
          placeholder="${field.placeholder || ''}"
          ${field.max_length ? `maxlength="${field.max_length}"` : ''}
          data-field="${field.name}" />`;
  }

  return `
    <div class="form-group" id="pub-group-${field.name}">
      <label class="form-label" for="pub-field-${field.name}">${field.label}${requiredMark}</label>
      <div class="input-wrapper">
        ${inputHtml}
      </div>
      <div class="field-error" id="pub-error-${field.name}"></div>
    </div>`;
}

function togglePubSection(sectionId) {
  const section = document.getElementById(`pub-section-${sectionId}`);
  const body = document.getElementById(`pub-section-body-${sectionId}`);
  const toggle = document.getElementById(`pub-toggle-${sectionId}`);
  if (!body || !toggle || !section) return;

  const isCollapsed = section.classList.contains('section-collapsed');
  if (isCollapsed) {
    section.classList.remove('section-collapsed');
    body.style.display = '';
    toggle.textContent = '▼';
  } else {
    section.classList.add('section-collapsed');
    body.style.display = 'none';
    toggle.textContent = '▶';
  }
}

function applyPublicMask(el, type) {
  let v = el.value;
  switch (type) {
    case 'numeric':
      v = v.replace(/\D/g, '').slice(0, 8);
      break;
    case 'date':
      v = v.replace(/\D/g, '');
      if (v.length >= 5) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4, 8);
      else if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
      break;
    case 'phone':
      v = v.replace(/[^\d\-]/g, '');
      if (v.length === 4 && !v.includes('-')) v += '-';
      break;
  }
  el.value = v;
}

function attachPublicFieldListeners() {
  if (!currentPublicForm) return;
  (currentPublicForm.sections || []).forEach((section) => {
    (section.fields || []).forEach((field) => {
      const el = document.getElementById(`pub-field-${field.name}`);
      if (!el) return;

      const fe = field.frontend || {};
      const mask = fe.mask || field.mask || (field.type === 'date' ? 'date' : null);

      if (mask === 'date') {
        el.addEventListener('input', () => applyPublicMask(el, 'date'));
      } else if (mask === 'numeric') {
        el.addEventListener('input', () => applyPublicMask(el, 'numeric'));
      } else if (mask === 'phone') {
        el.addEventListener('input', () => applyPublicMask(el, 'phone'));
      } else {
        el.addEventListener('input', () => clearPublicError(field.name));
      }

      el.addEventListener('blur', () => validatePublicField(field));
    });
  });
}

function validatePublicField(field) {
  const el = document.getElementById(`pub-field-${field.name}`);
  if (!el) return true;
  const val = el.type === 'checkbox' ? el.checked : el.value.trim();
  const errorEl = document.getElementById(`pub-error-${field.name}`);

  if (field.required && !val) {
    if (errorEl) errorEl.textContent = `${field.label} es obligatorio`;
    if (el) el.classList.add('input-error');
    return false;
  }
  if (!val && !field.required) {
    clearPublicError(field.name);
    return true;
  }

  const fe = field.frontend || {};
  if (fe.validation) {
    if (fe.validation.pattern && !new RegExp(fe.validation.pattern).test(val)) {
      if (errorEl) errorEl.textContent = fe.validation.message || 'Valor inválido';
      if (el) el.classList.add('input-error');
      return false;
    }
    if (fe.validation.min_length && val.length < fe.validation.min_length) {
      if (errorEl) errorEl.textContent = fe.validation.message || 'Muy corto';
      if (el) el.classList.add('input-error');
      return false;
    }
  }

  clearPublicError(field.name);
  return true;
}

function clearPublicError(fieldName) {
  const errorEl = document.getElementById(`pub-error-${fieldName}`);
  const inputEl = document.getElementById(`pub-field-${fieldName}`);
  if (errorEl) errorEl.textContent = '';
  if (inputEl) inputEl.classList.remove('input-error');
}

function validateAllPublicFields() {
  let valid = true;
  (currentPublicForm.sections || []).forEach((section) => {
    (section.fields || []).forEach((field) => {
      if (!validatePublicField(field)) valid = false;
    });
  });
  return valid;
}

function getPublicFormData() {
  const data = {};
  (currentPublicForm.sections || []).forEach((section) => {
    (section.fields || []).forEach((field) => {
      const el = document.getElementById(`pub-field-${field.name}`);
      if (!el) return;
      if (field.type === 'boolean' || field.type === 'checkbox') {
        data[field.name] = el.checked;
      } else {
        const val = el.value.trim();
        data[field.name] = val === '' ? null : val;
      }
    });
  });
  return data;
}

function setPublicFormStatus(msg, tipo) {
  const el = document.getElementById('public-form-status');
  if (!el) return;
  el.textContent = msg;
  el.className = `form-status ${tipo}`;
}

async function enviarFormularioPublico() {
  if (!validateAllPublicFields()) {
    setPublicFormStatus('⚠️ Corregí los errores antes de continuar.', 'error');
    return;
  }

  const datos = getPublicFormData();
  const formName = currentPublicForm.name;

  try {
    const res = await fetch(`${API_BASE}/submissions/${formName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });

    if (res.ok) {
      setPublicFormStatus('✅ Formulario enviado correctamente.', 'success');
      document.getElementById('public-form-dinamico').innerHTML = '';
      showToast('✅ Formulario enviado.');
    } else {
      const err = await res.json().catch(() => ({}));
      setPublicFormStatus(`❌ Error: ${err.detail || res.statusText}`, 'error');
    }
  } catch (e) {
    setPublicFormStatus('⚠️ No se pudo conectar con el servidor.', 'error');
  }
}