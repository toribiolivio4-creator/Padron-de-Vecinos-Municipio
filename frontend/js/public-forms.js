let publicFormsData = [];
let currentPublicForm = null;
let currentSubmissions = [];

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

  const chkOptions = field.frontend?.options || field.options;
  if (field.type === 'checkbox' && chkOptions && chkOptions.length > 0) {
    const checkboxes = chkOptions.map((opt, oIdx) => `
      <label class="checkbox-label" style="display:block;margin:4px 0;">
        <input type="checkbox" id="pub-field-${field.name}-${oIdx}"
               name="pub-field-${field.name}" value="${opt.value}"
               data-field="${field.name}" />
        <span class="checkbox-text">${opt.label}</span>
      </label>
    `).join('');
    return `
      <div class="form-group" id="pub-group-${field.name}">
        <label class="form-label">${field.label}${requiredMark}</label>
        <div class="input-wrapper" style="padding:4px 0;">
          ${checkboxes}
        </div>
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

  autoFillFromPadron();
}

function autoFillFromPadron() {
  const dniField = document.querySelector('[id^="pub-field-"][data-field="dni"]');
  if (!dniField) return;

  const autoFillMap = ['nombres', 'apellidos', 'fecha_nacimiento', 'celular'];

  dniField.addEventListener('blur', async () => {
    const dni = dniField.value.trim();
    if (!dni || dni.length < 7) return;

    try {
      const res = await fetch(`${API_BASE}/personas/${dni}`);
      if (!res.ok) return;

      const persona = await res.json();
      autoFillMap.forEach((fieldName) => {
        const target = document.getElementById(`pub-field-${fieldName}`);
        if (target && persona[fieldName] != null) {
          target.value = persona[fieldName];
          if (fieldName !== 'celular') {
            target.readOnly = true;
            target.classList.add('input-readonly');
          }
          clearPublicError(fieldName);
        }
      });
    } catch (e) {
      // Persona no encontrada — no autocompletar
    }
  });
}

function validatePublicField(field) {
  const errorEl = document.getElementById(`pub-error-${field.name}`);

  const chkOptions = field.frontend?.options || field.options;
  if (field.type === 'checkbox' && chkOptions && chkOptions.length > 0) {
    const checked = document.querySelectorAll(`input[name="pub-field-${field.name}"]:checked`);
    if (field.required && checked.length === 0) {
      if (errorEl) errorEl.textContent = `${field.label} es obligatorio`;
      return false;
    }
    clearPublicError(field.name);
    return true;
  }

  const el = document.getElementById(`pub-field-${field.name}`);
  if (!el) return true;
  const val = el.type === 'checkbox' ? el.checked : el.value.trim();

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
      const chkOptions = field.frontend?.options || field.options;
      if (field.type === 'checkbox' && chkOptions && chkOptions.length > 0) {
        const checked = document.querySelectorAll(`input[name="pub-field-${field.name}"]:checked`);
        data[field.name] = Array.from(checked).map(cb => cb.value);
        return;
      }
      const el = document.getElementById(`pub-field-${field.name}`);
      if (!el) return;
      if (field.type === 'boolean') {
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

async function verRespuestasAnteriores() {
  if (!currentPublicForm) return;
  const formName = currentPublicForm.name;

  document.getElementById('modal-respuestas').style.display = '';
  document.getElementById('modal-respuestas-title').textContent = currentPublicForm.title;
  document.getElementById('modal-respuestas-loading').style.display = '';
  document.getElementById('modal-respuestas-empty').style.display = 'none';
  document.getElementById('modal-respuestas-table-wrapper').style.display = 'none';
  document.getElementById('search-respuestas').value = '';

  try {
    const res = await fetch(`${API_BASE}/submissions/${formName}?limit=100`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    currentSubmissions = await res.json();

    document.getElementById('modal-respuestas-loading').style.display = 'none';

    if (currentSubmissions.length === 0) {
      document.getElementById('modal-respuestas-empty').style.display = '';
      return;
    }

    renderRespuestasTable(currentSubmissions);
    document.getElementById('modal-respuestas-table-wrapper').style.display = '';
  } catch (err) {
    console.error('Error cargando respuestas:', err);
    document.getElementById('modal-respuestas-loading').style.display = 'none';
    document.getElementById('modal-respuestas-empty').style.display = '';
    document.getElementById('modal-respuestas-empty').textContent = 'Error al cargar las respuestas.';
  }
}

function getFieldLabel(fieldName) {
  if (!currentPublicForm || !currentPublicForm.sections) return fieldName;
  for (const section of currentPublicForm.sections) {
    const field = (section.fields || []).find(f => f.name === fieldName);
    if (field) return field.label || fieldName;
  }
  return fieldName;
}

function renderRespuestasTable(submissions) {
  if (submissions.length === 0) {
    document.getElementById('modal-respuestas-tbody').innerHTML =
      `<tr><td colspan="99" class="table-empty">No se encontraron resultados.</td></tr>`;
    return;
  }

  const fields = Object.keys(submissions[0]).filter(k => k !== '_submitted_at' && k !== '_id_str');
  const thead = document.getElementById('modal-respuestas-thead');
  const tbody = document.getElementById('modal-respuestas-tbody');

  thead.innerHTML = `<tr>
    <th>#</th>
    ${fields.map(f => `<th>${getFieldLabel(f)}</th>`).join('')}
    <th>Enviado</th>
    <th style="width:50px;">Detalles</th>
  </tr>`;

  tbody.innerHTML = submissions.map((sub, i) => {
    const encoded = encodeURIComponent(JSON.stringify(sub));
    return `
    <tr>
      <td>${i + 1}</td>
      ${fields.map(f => `<td>${formatValueWithLabel(f, sub[f])}</td>`).join('')}
      <td>${formatDate(sub._submitted_at)}</td>
      <td style="text-align:center;">
        <button class="btn-row-view" onclick="verDetalleRespuesta('${encoded}')" title="Ver detalle">👁️</button>
      </td>
    </tr>`;
  }).join('');
}

function verDetalleRespuesta(encoded) {
  const sub = JSON.parse(decodeURIComponent(encoded));
  const idStr = sub._id_str || '';
  const body = document.getElementById('detalle-respuesta-body');
  const fields = Object.keys(sub).filter(k => k !== '_submitted_at' && k !== '_id_str');

  body.innerHTML = `
    <div class="detalle-grid">
      ${fields.map(f => `
        <div class="detalle-item">
          <span class="detalle-label">${getFieldLabel(f)}</span>
          <span class="detalle-value">${formatValueWithLabel(f, sub[f]) || '—'}</span>
        </div>
      `).join('')}
      <div class="detalle-item">
        <span class="detalle-label">Enviado</span>
        <span class="detalle-value">${formatDate(sub._submitted_at) || '—'}</span>
      </div>
    </div>
    <div style="margin-top:1.5rem; display:flex; justify-content:flex-end; gap:0.5rem;">
      <button class="btn btn-danger" onclick="eliminarRespuesta('${idStr}')">🗑️ Eliminar</button>
    </div>
  `;

  document.getElementById('modal-detalle-respuesta').style.display = '';
}

let _resolveEliminarRespuesta = null;

function abrirModalEliminarRespuesta() {
  const modal = document.getElementById('modal-confirmar-eliminar-respuesta');
  modal.style.display = 'flex';
  return new Promise((resolve) => {
    _resolveEliminarRespuesta = resolve;
  });
}

function cerrarModalEliminarRespuesta(confirmado) {
  document.getElementById('modal-confirmar-eliminar-respuesta').style.display = 'none';
  if (_resolveEliminarRespuesta) {
    _resolveEliminarRespuesta(confirmado);
    _resolveEliminarRespuesta = null;
  }
}

async function eliminarRespuesta(idStr) {
  if (!idStr) {
    showToast('⚠️ No se puede identificar la respuesta.');
    return;
  }

  const confirmado = await abrirModalEliminarRespuesta();
  if (!confirmado) return;

  const formName = currentPublicForm.name;
  try {
    const res = await fetch(`${API_BASE}/submissions/${formName}/${idStr}/baja`, {
      method: 'PUT',
    });
    if (res.ok) {
      showToast('✅ Respuesta eliminada correctamente.');
      cerrarDetalleRespuesta();
      verRespuestasAnteriores();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(`❌ Error: ${err.detail || 'No se pudo eliminar'}`);
    }
  } catch (e) {
    showToast('⚠️ Error de conexión al eliminar');
  }
}

function cerrarDetalleRespuesta(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('modal-detalle-respuesta').style.display = 'none';
}

function filtrarRespuestas(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    renderRespuestasTable(currentSubmissions);
    return;
  }

  const filtered = currentSubmissions.filter(sub =>
    (sub.dni && String(sub.dni).toLowerCase().includes(q)) ||
    (sub.nombres && String(sub.nombres).toLowerCase().includes(q)) ||
    (sub.apellidos && String(sub.apellidos).toLowerCase().includes(q))
  );

  renderRespuestasTable(filtered);
}

function limpiarBusquedaRespuestas() {
  document.getElementById('search-respuestas').value = '';
  renderRespuestasTable(currentSubmissions);
}

function cerrarModalRespuestas(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('modal-respuestas').style.display = 'none';
}

function getFieldOptions(fieldName) {
  if (!currentPublicForm || !currentPublicForm.sections) return null;
  for (const section of currentPublicForm.sections) {
    const field = (section.fields || []).find(f => f.name === fieldName);
    if (field) {
      const opts = field.frontend?.options || field.options || null;
      return opts;
    }
  }
  return null;
}

function formatValueWithLabel(fieldName, val) {
  if (val === null || val === undefined) return '';
  const opts = getFieldOptions(fieldName);
  if (opts) {
    if (Array.isArray(val)) {
      return val.map(v => {
        const opt = opts.find(o => String(o.value) === String(v));
        return opt ? opt.label : v;
      }).join(', ');
    }
    const opt = opts.find(o => String(o.value) === String(val));
    if (opt) return opt.label;
  }
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  return String(val);
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
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
      const actions = document.getElementById('public-form-actions');
      if (actions) actions.style.display = 'none';
      showToast('✅ Formulario enviado.');
    } else {
      const err = await res.json().catch(() => ({}));
      setPublicFormStatus(`❌ Error: ${err.detail || res.statusText}`, 'error');
    }
  } catch (e) {
    setPublicFormStatus('⚠️ No se pudo conectar con el servidor.', 'error');
  }
}