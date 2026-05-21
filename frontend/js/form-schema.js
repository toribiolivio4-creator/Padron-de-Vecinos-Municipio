// form-schema.js — AUTO-GENERADO desde form-definitions.json
// NO EDITAR MANUALMENTE. Modificar el JSON y correr generate_forms.py

const FORM_SCHEMA = {
    sections: [
        {
            id: "datos-personales",
            title: "Datos Personales",
            icon: "👤",
            fields: [
                {
                    id: "dni",
                    label: "DNI",
                    type: "text",
                    required: true,
                    maxLength: 8,
                    placeholder: "Ej: 30123456",
                    mask: "numeric",
                    autocomplete: true,
                    autocompleteEndpoint: "/personas",
                    autocompleteParam: "dni_prefix",
                    validation: {
                        pattern: /^\d{7,8}$/,
                        message: "El DNI debe tener 7 u 8 dígitos numéricos",
                    },
                },
                {
                    id: "nombres",
                    label: "Nombre/s",
                    type: "text",
                    required: true,
                    placeholder: "Nombre/s",
                    validation: {
                        message: "El nombre debe tener al menos 2 caracteres",
                        minLength: 2,
                    },
                },
                {
                    id: "apellidos",
                    label: "Apellido/s",
                    type: "text",
                    required: true,
                    placeholder: "Apellido/s",
                    validation: {
                        message: "El apellido debe tener al menos 2 caracteres",
                        minLength: 2,
                    },
                },
                {
                    id: "fecha_nacimiento",
                    label: "Fecha de Nacimiento",
                    type: "date",
                    required: true,
                    placeholder: "DD/MM/AAAA",
                    mask: "date",
                    validation: {
                        custom: "validateFechaNacimiento",
                    },
                },
                {
                    id: "sexo",
                    label: "Sexo",
                    type: "select",
                    options: [
                        { value: "", label: "— Seleccionar —" },
                        { value: "M", label: "Masculino" },
                        { value: "F", label: "Femenino" },
                        { value: "X", label: "No binario" },
                    ],
                },
            ],
        },
        {
            id: "contacto",
            title: "Contacto",
            icon: "📞",
            fields: [
                {
                    id: "celular",
                    label: "Teléfono",
                    type: "text",
                    placeholder: "Ej: 2337-123456",
                    mask: "phone",
                    validation: {
                        pattern: /^[\d\-]{0,15}$/,
                        message: "Formato inválido. Ej: 2337-123456",
                    },
                },
                {
                    id: "email",
                    label: "Email",
                    type: "email",
                    placeholder: "correo@ejemplo.com",
                    validation: {
                        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Ingresá un email válido",
                    },
                },
                {
                    id: "domicilio",
                    label: "Domicilio",
                    type: "text",
                    placeholder: "Calle y número",
                },
                {
                    id: "localidad",
                    label: "Localidad",
                    type: "text",
                    placeholder: "Ej: Rivadavia",
                    autocomplete: true,
                    autocompleteSource: "localidades",
                },
            ],
        },
        {
            id: "socioeconomico",
            title: "Datos Socioeconómicos",
            icon: "📊",
            fields: [
                {
                    id: "ocupacion",
                    label: "Ocupación",
                    type: "text",
                    placeholder: "Ej: Comerciante",
                    autocomplete: true,
                    autocompleteSource: "ocupaciones",
                },
                {
                    id: "nivel_estudios",
                    label: "Nivel de estudios",
                    type: "select",
                    defaultValue: "No especificado",
                    options: [
                        { value: "No especificado", label: "No especificado" },
                        { value: "Primario", label: "Primario" },
                        { value: "Secundario", label: "Secundario" },
                        { value: "Terciario", label: "Terciario" },
                        { value: "Universitario", label: "Universitario" },
                    ],
                },
                {
                    id: "jubilado",
                    label: "Jubilado",
                    type: "checkbox",
                    defaultValue: false,
                    conditional: {
                        showFields: ["obra_social", "fecha_jubilacion"],
                    },
                },
                {
                    id: "pensionado",
                    label: "Pensionado",
                    type: "checkbox",
                    defaultValue: false,
                    conditional: {
                        showFields: ["tipo_pension"],
                    },
                },
            ],
        },
        {
            id: "condicionales",
            title: "Información Adicional",
            icon: "📋",
            collapsed: true,
            fields: [
                {
                    id: "obra_social",
                    label: "Obra Social",
                    type: "text",
                    placeholder: "Nombre de la obra social",
                    visible: false,
                    dependsOn: "jubilado",
                },
                {
                    id: "fecha_jubilacion",
                    label: "Fecha de Jubilación",
                    type: "date",
                    placeholder: "DD/MM/AAAA",
                    mask: "date",
                    visible: false,
                    dependsOn: "jubilado",
                },
                {
                    id: "tipo_pension",
                    label: "Tipo de Pensión",
                    type: "select",
                    visible: false,
                    dependsOn: "pensionado",
                    options: [
                        { value: "", label: "— Seleccionar —" },
                        { value: "Nacional", label: "Nacional" },
                        { value: "Provincial", label: "Provincial" },
                        { value: "Municipal", label: "Municipal" },
                        { value: "Otra", label: "Otra" },
                    ],
                },
                {
                    id: "grupo_sanguineo",
                    label: "Grupo Sanguíneo",
                    type: "select",
                    options: [
                        { value: "", label: "— Seleccionar —" },
                        { value: "A+", label: "A+" },
                        { value: "A-", label: "A-" },
                        { value: "B+", label: "B+" },
                        { value: "B-", label: "B-" },
                        { value: "AB+", label: "AB+" },
                        { value: "AB-", label: "AB-" },
                        { value: "O+", label: "O+" },
                        { value: "O-", label: "O-" },
                    ],
                },
                {
                    id: "tipo_vivienda",
                    label: "Tipo de Vivienda",
                    type: "select",
                    options: [
                        { value: "", label: "— Seleccionar —" },
                        { value: "Propia", label: "Propia" },
                        { value: "Alquilada", label: "Alquilada" },
                        { value: "Prestada", label: "Prestada" },
                        { value: "Precaria", label: "Precaria" },
                    ],
                },
            ],
        },
    ],
};
