// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Selección de Elementos del DOM ---
    const inputTarea = document.getElementById('input-tarea');
    const botonAgregar = document.getElementById('boton-agregar');
    const listaTareas = document.getElementById('lista-tareas');
    const alertaError = document.getElementById('alerta-error');
    const contadorPendientes = document.getElementById('contador-pendientes');
    const botonEliminarTodo = document.getElementById('boton-eliminar-todo');
    const botonExportar = document.getElementById('boton-exportar');
    const inputImportar = document.getElementById('input-importar');

    const filtrosBotones = {
        todas: document.getElementById('filtro-todas'),
        pendientes: document.getElementById('filtro-pendientes'),
        completadas: document.getElementById('filtro-completadas')
    };

    // --- 2. Estado de la Aplicación ---
    let tareas = JSON.parse(localStorage.getItem('tareas')) || [];
    let filtroActual = 'todas';

    // --- 3. Función de Renderizado (MODIFICADA) ---
    function render() {
        listaTareas.innerHTML = '';
        
        const tareasFiltradas = tareas.filter(tarea => {
            if (filtroActual === 'pendientes') return !tarea.completada;
            if (filtroActual === 'completadas') return tarea.completada;
            return true;
        });

        tareasFiltradas.forEach(tarea => {
            const li = document.createElement('li');
            li.className = 'tarea-item';
            li.dataset.id = tarea.id;
            if (tarea.completada) li.classList.add('completada');

            // --- LÓGICA DE EDICIÓN ---
            if (tarea.isEditing) {
                // Si la tarea está en modo edición, renderiza un input
                li.classList.add('editando');
                const inputEdicion = document.createElement('input');
                inputEdicion.className = 'input-edicion';
                inputEdicion.type = 'text';
                inputEdicion.value = tarea.texto;

                inputEdicion.addEventListener('keydown', (e) => manejarGuardadoEdicion(e, tarea.id));
                inputEdicion.addEventListener('blur', () => finalizarEdicion(tarea.id, true));

                li.appendChild(inputEdicion);
                setTimeout(() => inputEdicion.focus(), 0);

            } else {
                // Renderizado normal (MODIFICADO)
                if (tarea.completada) li.classList.add('completada');

                const spanTexto = document.createElement('span');
                spanTexto.className = 'tarea-texto';
                spanTexto.textContent = tarea.texto;

                // --- INICIO: Creación de botones ---
                // Botón de Modificar (NUEVO)
                const botonModificar = document.createElement('button');
                botonModificar.textContent = 'Modificar';
                // Usamos clases base y específicas
                botonModificar.className = 'boton-accion boton-modificar'; 

                // Botón de eliminar (MODIFICADO)
                const botonEliminar = document.createElement('button');
                botonEliminar.textContent = 'Eliminar';
                botonEliminar.className = 'boton-accion boton-eliminar';
                // --- FIN: Creación de botones ---

                li.appendChild(spanTexto);
                li.appendChild(botonModificar); // Añadido
                li.appendChild(botonEliminar);
            }
            // --- FIN LÓGICA DE EDICIÓN ---

            listaTareas.appendChild(li);
        });

        const pendientes = tareas.filter(t => !t.completada).length;
        contadorPendientes.textContent = pendientes;
        actualizarBotonesFiltro();
    }

    // --- 4. Funciones de Lógica de la Aplicación ---

    function agregarTarea() {
        const textoTarea = inputTarea.value.trim();
        if (textoTarea === '') {
            mostrarAlerta('⚠️ Por favor, ingresa una tarea válida (no vacía).', 'error');
            return;
        }
        
        const nuevaTarea = {
            id: Date.now(),
            texto: textoTarea,
            completada: false,
            isEditing: false
        };

        tareas.push(nuevaTarea);
        guardarTareas();
        render();
        inputTarea.value = '';
    }

    // MODIFICADA: Ahora maneja 'boton-modificar'
    function manejarClickLista(e) {
        const itemTarea = e.target.closest('.tarea-item');
        if (!itemTarea) return;

        if (itemTarea.classList.contains('editando')) {
            return;
        }

        const idTarea = Number(itemTarea.dataset.id);

        // Completar/Descompletar
        if (e.target.classList.contains('tarea-texto')) {
            const tarea = tareas.find(t => t.id === idTarea);
            if (tarea) tarea.completada = !tarea.completada;
        }
        
        // Eliminar
        if (e.target.classList.contains('boton-eliminar')) {
            if (confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
                tareas = tareas.filter(t => t.id !== idTarea);
            }
        }

        // --- INICIO: LÓGICA NUEVA ---
        // Modificar (inicia modo edición)
        if (e.target.classList.contains('boton-modificar')) {
            iniciarEdicion(idTarea);
        }
        // --- FIN: LÓGICA NUEVA ---

        guardarTareas();
        render();
    }
    
    // --- NUEVAS FUNCIONES DE EDICIÓN ---

    // (Extraída del antiguo dblclick)
    function iniciarEdicion(idTarea) {
        // Poner todas las tareas como "no editando"
        tareas.forEach(t => t.isEditing = false);
        
        // Poner la tarea seleccionada como "editando"
        const tarea = tareas.find(t => t.id === idTarea);
        if (tarea) {
            tarea.isEditing = true;
        }

        render(); // Volver a renderizar para mostrar el input
    }

    function manejarGuardadoEdicion(e, id) {
        if (e.key === 'Enter') {
            finalizarEdicion(id, true); // Guardar
        } else if (e.key === 'Escape') {
            finalizarEdicion(id, false); // Cancelar (no guardar)
        }
    }

    function finalizarEdicion(id, guardar = false) {
        const tarea = tareas.find(t => t.id === id);
        if (!tarea || !tarea.isEditing) return; 

        if (guardar) {
            const inputEdicion = document.querySelector(`.tarea-item[data-id="${id}"] .input-edicion`);
            const nuevoTexto = inputEdicion.value.trim();

            if (nuevoTexto === '') {
                mostrarAlerta('⚠️ La tarea no puede estar vacía. Se eliminará.', 'error');
                tareas = tareas.filter(t => t.id !== id);
            } else {
                tarea.texto = nuevoTexto;
            }
            guardarTareas();
        }

        tarea.isEditing = false;
        render();
    }
    // --- FIN NUEVAS FUNCIONES DE EDICIÓN ---

    function cambiarFiltro(nuevoFiltro) {
        filtroActual = nuevoFiltro;
        render();
    }

    function actualizarBotonesFiltro() {
        Object.values(filtrosBotones).forEach(boton => boton.classList.remove('activo'));
        filtrosBotones[filtroActual].classList.add('activo');
    }

    function eliminarTodasLasTareas() {
        if (tareas.length === 0) {
            mostrarAlerta('ℹ️ No hay tareas para eliminar.', 'info');
            return;
        }
        if (confirm('¿Estás seguro de que deseas eliminar TODAS las tareas? Esta acción no se puede deshacer.')) {
            tareas = [];
            guardarTareas();
            render();
        }
    }

    function exportarTareas() {
        if (tareas.length === 0) {
            mostrarAlerta('ℹ️ No hay tareas para exportar.', 'info');
            return;
        }
        const jsonString = JSON.stringify(tareas, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tareas.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importarTareas(evento) {
        const archivo = evento.target.files[0];
        if (!archivo || archivo.type !== 'application/json') {
            mostrarAlerta('⚠️ Por favor, selecciona un archivo .json válido.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const tareasImportadas = JSON.parse(e.target.result);
                if (Array.isArray(tareasImportadas)) {
                    
                    tareas = tareasImportadas.map(t => ({
                        ...t,
                        completada: t.completada || false,
                        isEditing: false
                    }));

                    guardarTareas();
                    render();
                    mostrarAlerta('✅ Tareas importadas con éxito.', 'info');
                } else {
                    throw new Error('El archivo JSON no tiene el formato de array esperado.');
                }
            } catch (error) {
                mostrarAlerta(`⚠️ Error al importar el archivo: ${error.message}`, 'error');
            } finally {
                inputImportar.value = null;
            }
        };
        reader.readAsText(archivo);
    }

    // --- 5. Funciones Auxiliares ---

    function guardarTareas() {
        const tareasParaGuardar = tareas.map(t => ({
            id: t.id,
            texto: t.texto,
            completada: t.completada
        }));
        localStorage.setItem('tareas', JSON.stringify(tareasParaGuardar));
    }

    function mostrarAlerta(mensaje, tipo = 'error') {
        alertaError.textContent = mensaje;
        alertaError.classList.remove('error', 'info');
        alertaError.classList.add(tipo);
        alertaError.style.display = 'block';
        alertaError.style.opacity = '1';
        
        setTimeout(() => {
            alertaError.style.opacity = '0';
            setTimeout(() => { alertaError.style.display = 'none'; }, 300);
        }, 3000);
    }

    // --- 6. Asignación de Event Listeners ---

    botonAgregar.addEventListener('click', agregarTarea);
    inputTarea.addEventListener('keypress', (e) => { if (e.key === 'Enter') agregarTarea(); });

    // Clics en la lista (Completar/Eliminar/Modificar)
    listaTareas.addEventListener('click', manejarClickLista);
    
    // --- EVENTO 'dblclick' ELIMINADO ---

    // Clics en los filtros
    filtrosBotones.todas.addEventListener('click', () => cambiarFiltro('todas'));
    filtrosBotones.pendientes.addEventListener('click', () => cambiarFiltro('pendientes'));
    filtrosBotones.completadas.addEventListener('click', () => cambiarFiltro('completadas'));
    
    // Clics botones de gestión
    botonEliminarTodo.addEventListener('click', eliminarTodasLasTareas);
    botonExportar.addEventListener('click', exportarTareas);
    inputImportar.addEventListener('change', importarTareas);

    // --- 7. Inicialización ---
    tareas = tareas.map(t => ({ ...t, isEditing: false }));
    render();
});