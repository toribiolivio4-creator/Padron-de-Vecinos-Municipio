const FORM_FIELDS = {};
let autocompleteCache = { localidades: [], ocupaciones: [] };

function renderFormulario() {
    const container = document.getElementById("form-dinamico");
    if (!container) return;

    let html = "";

    FORM_SCHEMA.sections.forEach((section) => {
        const collapsedClass = section.collapsed ? " section-collapsed" : "";
        html += `
        <div class="form-section${collapsedClass}" id="section-${section.id}">
            <div class="form-section-header" onclick="toggleSection('${section.id}')">
                <h3 class="form-section-title">
                    <span class="form-section-icon">${section.icon}</span>
                    ${section.title}
                </h3>
                <span class="form-section-toggle" id="toggle-${section.id}">
                    ${section.collapsed ? "▶" : "▼"}
                </span>
            </div>
            <div class="form-section-body" id="section-body-${section.id}" ${section.collapsed ? 'style="display:none;"' : ""}>
                <div class="form-row-group">`;

        section.fields.forEach((field) => {
            const visibleClass = field.visible === false ? " field-hidden" : "";
            html += renderField(field, visibleClass);
        });

        html += `
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    attachFieldListeners();
}

function renderField(field, extraClass = "") {
    const requiredMark = field.required ? ' <span class="required-star">*</span>' : "";

    let inputHtml = "";

    switch (field.type) {
        case "text":
        case "email":
            inputHtml = `
                <input type="${field.type}" id="padron-${field.id}" class="form-input"
                    placeholder="${field.placeholder || ""}"
                    ${field.maxLength ? `maxlength="${field.maxLength}"` : ""}
                    data-field="${field.id}" />`;
            break;

        case "date":
            inputHtml = `
                <input type="text" id="padron-${field.id}" class="form-input"
                    placeholder="${field.placeholder || ""}"
                    ${field.maxLength ? `maxlength="${field.maxLength}"` : ""}
                    data-field="${field.id}" />`;
            break;

        case "select":
            const options = (field.options || []).map((opt) =>
                `<option value="${opt.value}" ${opt.value === field.defaultValue ? "selected" : ""}>${opt.label}</option>`
            ).join("");
            inputHtml = `
                <select id="padron-${field.id}" class="form-input" data-field="${field.id}">
                    ${options}
                </select>`;
            break;

        case "checkbox":
            inputHtml = `
                <label class="checkbox-label">
                    <input type="checkbox" id="padron-${field.id}" data-field="${field.id}" />
                    <span class="checkbox-text">${field.label}</span>
                </label>`;
            break;
    }

    if (field.type === "checkbox") {
        return `
        <div class="form-group form-checkbox-group${extraClass}" id="field-group-${field.id}">
            ${inputHtml}
            <div class="field-error" id="error-${field.id}"></div>
        </div>`;
    }

    return `
    <div class="form-group${extraClass}" id="field-group-${field.id}">
        <label class="form-label" for="padron-${field.id}">${field.label}${requiredMark}</label>
        <div class="input-wrapper">
            ${inputHtml}
            ${field.autocomplete ? `<div class="autocomplete-dropdown" id="dropdown-${field.id}"></div>` : ""}
        </div>
        <div class="field-error" id="error-${field.id}"></div>
    </div>`;
}

function attachFieldListeners() {
    FORM_SCHEMA.sections.forEach((section) => {
        section.fields.forEach((field) => {
            const el = document.getElementById(`padron-${field.id}`);
            if (!el) return;

            if (field.type === "checkbox") {
                el.addEventListener("change", () => handleConditionalFields(field.id, el.checked));
            } else if (field.mask === "date") {
                el.addEventListener("input", () => applyMask(el, "date"));
                el.addEventListener("blur", () => validateField(field));
            } else if (field.mask === "numeric") {
                el.addEventListener("input", () => applyMask(el, "numeric"));
                el.addEventListener("input", () => {
                    if (field.autocomplete) handleAutocomplete(field, el.value);
                });
                el.addEventListener("blur", () => validateField(field));
            } else if (field.mask === "phone") {
                el.addEventListener("input", () => applyMask(el, "phone"));
                el.addEventListener("blur", () => validateField(field));
            } else if (field.autocomplete) {
                el.addEventListener("input", () => handleAutocomplete(field, el.value));
                el.addEventListener("blur", () => {
                    setTimeout(() => hideDropdown(field.id), 200);
                    validateField(field);
                });
                el.addEventListener("focus", () => {
                    if (el.value.length >= 1) handleAutocomplete(field, el.value);
                });
            } else {
                el.addEventListener("blur", () => validateField(field));
                el.addEventListener("input", () => clearFieldError(field.id));
            }
        });
    });

    const dniEl = document.getElementById("padron-dni");
    if (dniEl) {
        let debounceTimer;
        dniEl.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            const dni = dniEl.value.trim();
            if (dni.length < 7) {
                setUpdateMode(false);
                return;
            }
            debounceTimer = setTimeout(() => buscarDni(dni), 400);
        });
    }
}

function applyMask(el, type) {
    let v = el.value;

    switch (type) {
        case "numeric":
            v = v.replace(/\D/g, "").slice(0, 8);
            break;

        case "date":
            v = v.replace(/\D/g, "");
            if (v.length >= 5) v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4, 8);
            else if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
            break;

        case "phone":
            v = v.replace(/[^\d\-]/g, "");
            if (v.length === 4 && !v.includes("-")) v += "-";
            break;
    }

    el.value = v;
}

function handleConditionalFields(fieldId, isChecked) {
    const field = findFieldById(fieldId);
    if (!field || !field.conditional) return;

    field.conditional.showFields.forEach((targetId) => {
        const group = document.getElementById(`field-group-${targetId}`);
        if (group) {
            group.style.display = isChecked ? "" : "none";
            if (!isChecked) {
                const input = document.getElementById(`padron-${targetId}`);
                if (input) {
                    if (input.type === "checkbox") input.checked = false;
                    else input.value = "";
                }
                clearFieldError(targetId);
            }
        }
    });
}

function toggleSection(sectionId) {
    const section = document.getElementById(`section-${sectionId}`);
    const body = document.getElementById(`section-body-${sectionId}`);
    const toggle = document.getElementById(`toggle-${sectionId}`);
    if (!body || !toggle || !section) return;

    const isCollapsed = section.classList.contains("section-collapsed");
    if (isCollapsed) {
        section.classList.remove("section-collapsed");
        body.style.display = "";
        toggle.textContent = "▼";
    } else {
        section.classList.add("section-collapsed");
        body.style.display = "none";
        toggle.textContent = "▶";
    }
}

function findFieldById(id) {
    for (const section of FORM_SCHEMA.sections) {
        const found = section.fields.find((f) => f.id === id);
        if (found) return found;
    }
    return null;
}

async function buscarDni(dni) {
    try {
        const res = await fetch(`${API_BASE}/personas/${dni}`);
        if (res.ok) {
            const p = await res.json();
            cargarDatosEnForm(p);
            setFormStatus("✅ Persona encontrada. Podés actualizar o eliminar.", "success");
        } else {
            setUpdateMode(false);
            setFormStatus("ℹ️ DNI no registrado. Completá los datos para agregar.", "info");
        }
    } catch (err) {
        setFormStatus("⚠️ Error al consultar el servidor.", "error");
    }
}

function cargarDatosEnForm(p) {
    FORM_SCHEMA.sections.forEach((section) => {
        section.fields.forEach((field) => {
            const el = document.getElementById(`padron-${field.id}`);
            if (!el) return;

            if (field.type === "checkbox") {
                el.checked = !!p[field.id];
                if (field.conditional && p[field.id]) {
                    handleConditionalFields(field.id, true);
                }
            } else if (field.type === "date" && p[field.id]) {
                const f = p[field.id].split("T")[0];
                const [y, m, d] = f.split("-");
                el.value = `${d}/${m}/${y}`;
            } else {
                el.value = p[field.id] ?? "";
            }
        });
    });

    setUpdateMode(true);
}

function setUpdateMode(active) {
    isUpdateMode.padron = active;
    const btnAdd = document.getElementById("btn-agregar-padron");
    const btnAct = document.getElementById("btn-actualizar-padron");
    const btnDel = document.getElementById("btn-eliminar-padron");
    if (btnAdd) btnAdd.disabled = active;
    if (btnAct) btnAct.disabled = !active;
    if (btnDel) btnDel.disabled = !active;

    const dniEl = document.getElementById("padron-dni");
    if (dniEl) dniEl.readOnly = active;
}

function getFormData() {
    const data = {};
    FORM_SCHEMA.sections.forEach((section) => {
        section.fields.forEach((field) => {
            const el = document.getElementById(`padron-${field.id}`);
            if (!el) return;
            if (field.visible === false && el.closest(".field-hidden")) return;

            if (field.type === "checkbox") {
                data[field.id] = el.checked;
            } else if (field.type === "date") {
                data[field.id] = parsearFecha(el.value);
            } else {
                const val = el.value.trim();
                data[field.id] = val === "" ? null : val;
            }
        });
    });

    data.apellidos = data.apellidos ?? data.apellido;
    data.nombres = data.nombres ?? data.nombre;
    data.celular = data.celular ?? data.telefono;

    return data;
}

function parsearFecha(str) {
    if (!str) return null;
    const parts = str.split("/");
    if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    return null;
}

function validateField(field) {
    const el = document.getElementById(`padron-${field.id}`);
    if (!el) return true;
    if (field.visible === false && el.closest(".field-hidden")) return true;

    const val = el.type === "checkbox" ? el.checked : el.value.trim();
    const errorEl = document.getElementById(`error-${field.id}`);

    if (field.required && !val) {
        showFieldError(field.id, `${field.label} es obligatorio`);
        return false;
    }

    if (!val && !field.required) {
        clearFieldError(field.id);
        return true;
    }

    if (field.validation) {
        if (field.validation.pattern && !field.validation.pattern.test(val)) {
            showFieldError(field.id, field.validation.message);
            return false;
        }

        if (field.validation.minLength && val.length < field.validation.minLength) {
            showFieldError(field.id, field.validation.message);
            return false;
        }

        if (field.validation.custom) {
            const result = window[field.validation.custom]?.(val);
            if (result !== true) {
                showFieldError(field.id, result || "Valor inválido");
                return false;
            }
        }
    }

    clearFieldError(field.id);
    return true;
}

function validateAllFields() {
    let valid = true;
    FORM_SCHEMA.sections.forEach((section) => {
        section.fields.forEach((field) => {
            if (!validateField(field)) valid = false;
        });
    });
    return valid;
}

function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(`error-${fieldId}`);
    const inputEl = document.getElementById(`padron-${fieldId}`);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add("input-error");
}

function clearFieldError(fieldId) {
    const errorEl = document.getElementById(`error-${fieldId}`);
    const inputEl = document.getElementById(`padron-${fieldId}`);
    if (errorEl) errorEl.textContent = "";
    if (inputEl) inputEl.classList.remove("input-error");
}

function validateFechaNacimiento(val) {
    const parsed = parsearFecha(val);
    if (!parsed) return "Formato de fecha inválido. Usá DD/MM/AAAA";

    const fecha = new Date(parsed);
    const hoy = new Date();
    const edad = hoy.getFullYear() - fecha.getFullYear();

    if (fecha > hoy) return "La fecha no puede ser futura";
    if (edad > 120) return "Fecha de nacimiento inválida";
    if (edad < 0) return "Fecha de nacimiento inválida";

    return true;
}

async function handleAutocomplete(field, value) {
    const dropdown = document.getElementById(`dropdown-${field.id}`);
    if (!dropdown) return;

    const query = value.trim().toLowerCase();
    if (query.length < 1) {
        hideDropdown(field.id);
        return;
    }

    let items = [];

    if (field.autocompleteSource) {
        if (autocompleteCache[field.autocompleteSource].length === 0) {
            await loadAutocompleteSource(field.autocompleteSource);
        }
        items = autocompleteCache[field.autocompleteSource].filter((item) =>
            item.toLowerCase().includes(query)
        );
    } else if (field.autocompleteEndpoint) {
        try {
            const res = await fetch(`${API_BASE}${field.autocompleteEndpoint}?${field.autocompleteParam}=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                items = data.map((item) => item[field.id] || item.dni).filter(Boolean);
            }
        } catch (e) {
            console.warn("Autocomplete error:", e);
        }
    }

    if (items.length === 0) {
        hideDropdown(field.id);
        return;
    }

    dropdown.innerHTML = items.slice(0, 8).map((item) =>
        `<div class="autocomplete-item" onmousedown="selectAutocomplete('${field.id}', '${item.replace(/'/g, "\\'")}')">${highlightMatch(item, query)}</div>`
    ).join("");

    dropdown.style.display = "block";
}

async function loadAutocompleteSource(source) {
    try {
        const res = await fetch(`${API_BASE}/personas`);
        if (res.ok) {
            const data = await res.json();
            if (source === "localidades") {
                autocompleteCache.localidades = [...new Set(data.map((p) => p.localidad).filter(Boolean))];
            } else if (source === "ocupaciones") {
                autocompleteCache.ocupaciones = [...new Set(data.map((p) => p.ocupacion).filter(Boolean))];
            }
        }
    } catch (e) {
        console.warn("Error loading autocomplete source:", e);
    }
}

function selectAutocomplete(fieldId, value) {
    const el = document.getElementById(`padron-${fieldId}`);
    if (el) el.value = value;
    hideDropdown(fieldId);
    validateField(findFieldById(fieldId));
}

function hideDropdown(fieldId) {
    const dropdown = document.getElementById(`dropdown-${fieldId}`);
    if (dropdown) dropdown.style.display = "none";
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(regex, '<mark>$1</mark>');
}

function mostrarFormularioPadron() {
    document.getElementById("vista-tabla-padron").style.display = "none";
    document.getElementById("vista-formulario-padron").style.display = "";
    limpiarFormPadron();
}

function volverTablaPadron() {
    document.getElementById("vista-formulario-padron").style.display = "none";
    document.getElementById("vista-tabla-padron").style.display = "";
    cargarPadronCompleto();
}

function editarDesdeTabla(persona) {
    mostrarFormularioPadron();
    cargarDatosEnForm(persona);
}

function limpiarFormPadron() {
    FORM_SCHEMA.sections.forEach((section) => {
        section.fields.forEach((field) => {
            const el = document.getElementById(`padron-${field.id}`);
            if (!el) return;

            if (field.type === "checkbox") {
                el.checked = false;
                if (field.conditional) {
                    handleConditionalFields(field.id, false);
                }
            } else if (field.type === "select") {
                el.selectedIndex = field.options?.findIndex((opt) => opt.value === field.defaultValue) ?? 0;
            } else {
                el.value = "";
            }

            clearFieldError(field.id);
        });
    });

    setUpdateMode(false);
    setFormStatus("");
}

function setFormStatus(msg, tipo = "") {
    const el = document.getElementById("padron-form-status");
    if (!el) return;
    el.textContent = msg;
    el.className = `form-status ${tipo}`;
}

async function agregarPersona() {
    if (!validateAllFields()) {
        setFormStatus("⚠️ Corregí los errores antes de continuar.", "error");
        return;
    }

    const datos = getFormData();
    if (!datos.dni || !datos.apellidos || !datos.nombres || !datos.fecha_nacimiento) {
        setFormStatus("⚠️ DNI, apellido, nombre y fecha de nacimiento son obligatorios.", "error");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/personas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos),
        });

        if (res.ok) {
            setFormStatus("✅ Persona agregada correctamente.", "success");
            limpiarFormPadron();
            showToast("✅ Persona agregada.");
        } else {
            const err = await res.json().catch(() => ({}));
            setFormStatus(`❌ Error: ${err.detail ?? res.statusText}`, "error");
        }
    } catch (e) {
        setFormStatus("⚠️ No se pudo conectar con el servidor.", "error");
    }
}

async function actualizarPersona() {
    if (!validateAllFields()) {
        setFormStatus("⚠️ Corregí los errores antes de continuar.", "error");
        return;
    }

    const datos = getFormData();
    if (!datos.dni) {
        setFormStatus("⚠️ Ingresá un DNI.", "error");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/personas/${datos.dni}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos),
        });

        if (res.ok) {
            setFormStatus("✅ Datos actualizados correctamente.", "success");
            limpiarFormPadron();
            showToast("✅ Datos actualizados.");
        } else {
            const err = await res.json().catch(() => ({}));
            setFormStatus(`❌ Error: ${err.detail ?? res.statusText}`, "error");
        }
    } catch (e) {
        setFormStatus("⚠️ No se pudo conectar con el servidor.", "error");
    }
}

let _resolveModal = null;

function abrirModal(dni) {
    document.getElementById("modal-mensaje").textContent =
        `¿Estás seguro que querés eliminar el registro de DNI ${dni}? Esta acción lo ocultará del padrón pero no borrará el registro de la base de datos.`;
    const modal = document.getElementById("modal-confirmar");
    modal.style.display = "flex";
    return new Promise((resolve) => {
        _resolveModal = resolve;
    });
}

function cerrarModal(confirmado) {
    document.getElementById("modal-confirmar").style.display = "none";
    if (_resolveModal) {
        _resolveModal(confirmado);
        _resolveModal = null;
    }
}

async function eliminarPersona() {
    const datos = getFormData();
    if (!datos.dni) {
        setFormStatus("⚠️ Ingresá un DNI.", "error");
        return;
    }

    const confirmado = await abrirModal(datos.dni);
    if (!confirmado) return;

    try {
        const res = await fetch(`${API_BASE}/personas/${datos.dni}/baja`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: false }),
        });

        if (res.ok) {
            setFormStatus("✅ Registro eliminado del padrón (soft delete).", "success");
            limpiarFormPadron();
            showToast("🗑️ Registro dado de baja.");
        } else {
            const err = await res.json().catch(() => ({}));
            setFormStatus(`❌ Error: ${err.detail ?? res.statusText}`, "error");
        }
    } catch (e) {
        setFormStatus("⚠️ No se pudo conectar con el servidor.", "error");
    }
}

document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("autocomplete-dropdown") && !e.target.classList.contains("autocomplete-item")) {
        FORM_SCHEMA.sections.forEach((section) => {
            section.fields.forEach((field) => {
                if (field.autocomplete) hideDropdown(field.id);
            });
        });
    }
});
