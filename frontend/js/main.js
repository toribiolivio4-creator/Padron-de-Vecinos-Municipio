const API_BASE = 'http://127.0.0.1:8080';

// 🔥 CARGADOR DE COMPONENTES
function loadComponent(id, file) {
    fetch(file)
        .then(res => res.text())
        .then(data => {
            document.getElementById(id).innerHTML = data;
        });
}

// Cargar todo
loadComponent("header", "components/header.html");
loadComponent("tabs", "components/tabs.html");
loadComponent("feria", "components/feria.html");
loadComponent("padron", "components/padron.html");
loadComponent("footer", "components/footer.html");


// ================== TU LÓGICA ORIGINAL ==================

let debounceTimers = {};
let isUpdateMode = { feria: false, padron: false };

// (TODO tu JS lo pegás acá EXACTAMENTE como lo tenías)
// 👇👇👇 PEGÁ TODO TU SCRIPT ORIGINAL ACÁ 👇👇👇

// switchTab, handleDniInput, searchDni, etc...