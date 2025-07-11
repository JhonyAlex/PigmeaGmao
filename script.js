// Variables globales para almacenar los datos
const datos = {
    equipamientos: [],
    planes: [],
    preventivos: [],
    tareasTemp: [],
    currentExportType: null
};
const ALLOW_PLAN_SHARING = true; // Permitir usar un mismo plan en varios preventivos

// Configuración centralizada de periodicidades y sus equivalentes de frecuencia
// para los planned work. Esto facilita mantener y ampliar las opciones.
const PERIODICITY_CONFIG = {
    'Diario': { frequency: 'Daily', occursEvery: 1 },
    'Semanal': { frequency: 'Weekly', occursEvery: 1 },
    'Quincenal': { frequency: 'Weekly', occursEvery: 2 },
    'Bimestral': { frequency: 'Monthly', occursEvery: 2 },
    'Mensual': { frequency: 'Monthly', occursEvery: 1 },
    'Trimestral': { frequency: 'Monthly', occursEvery: 3 },
    'Semestral': { frequency: 'Monthly', occursEvery: 6 },
    'Anual': { frequency: 'Monthly', occursEvery: 12 }
};

/**
 * Devuelve la configuración de frecuencia para una periodicidad dada.
 * @param {string} periodicidad Texto de periodicidad (Ej: "Mensual").
 * @returns {{frequency: string, occursEvery: number}} Configuración asociada.
 */
function getFrequencyConfig(periodicidad) {
    const config = PERIODICITY_CONFIG[periodicidad];
    if (!config) {
        console.warn(`[getFrequencyConfig] Periodicidad '${periodicidad}' no encontrada en PERIODICITY_CONFIG. Se utilizará 'Mensual, 1'.`);
        return { frequency: 'Monthly', occursEvery: 1 };
    }
    return config;
}

/**
 * Normaliza los planes de mantenimiento para soportar versiones anteriores.
 * - Convierte la propiedad "equipamientoKey" a "equipamientos".
 * - Combina planes duplicados que tengan la misma clave.
 * @param {Array} planes Lista de planes almacenados.
 * @returns {Array} Lista normalizada de planes.
 */
function normalizarPlanes(planes = []) {
    const mapa = new Map();
    planes.forEach(p => {
        const plan = { ...p };
        if (!Array.isArray(plan.equipamientos)) {
            const eq = plan.equipamientoKey;
            plan.equipamientos = eq ? [eq] : [];
        }
        delete plan.equipamientoKey;
        delete plan.equipamientoPrefijo;

        const existente = mapa.get(plan.planKey);
        if (existente) {
            plan.equipamientos.forEach(eq => {
                if (!existente.equipamientos.includes(eq)) {
                    existente.equipamientos.push(eq);
                }
            });
        } else {
            mapa.set(plan.planKey, plan);
        }
    });
    return Array.from(mapa.values());
}
// Devuelve verdadero si el plan está asociado al equipamiento indicado
function planAsociadoA(plan, equipamientoKey) {
    return Array.isArray(plan.equipamientos) && plan.equipamientos.includes(equipamientoKey);
}

/**
 * Vincula un plan existente con un equipamiento, evitando duplicados.
 * @param {string} planKey Identificador del plan.
 * @param {string} equipamientoKey Identificador del equipamiento.
 * @returns {boolean} True si se realizó la vinculación.
 */
function vincularPlanConEquipo(planKey, equipamientoKey) {
    const plan = datos.planes.find(p => p.planKey === planKey);
    const equipamiento = datos.equipamientos.find(e => e.key === equipamientoKey);
    if (!plan || !equipamiento) return false;

    if (!Array.isArray(plan.equipamientos)) {
        plan.equipamientos = [];
    }

    if (planAsociadoA(plan, equipamientoKey)) return false;

    plan.equipamientos.push(equipamientoKey);
    actualizarFechaModificacionEquipamiento(equipamientoKey);
    return true;
}
// Obtener los planes disponibles según el equipamiento elegido
function obtenerPlanesDisponibles(equipamientoKey) {
    if (!equipamientoKey) return datos.planes;
    return datos.planes.filter(p => planAsociadoA(p, equipamientoKey));
}
// Función para realizar un desplazamiento suave personalizado
function scrollSmoothly(targetElement, duration = 800) {
    // Obtener la posición inicial y final
    const startPosition = window.pageYOffset;
    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
    
    // Calcular la distancia
    const distance = targetPosition - startPosition;
    
    // Si el elemento está muy cerca, aumentar la duración para que sea más lento
    const closeThreshold = 300; // Considerar "cerca" si está a 300px o menos
    let adjustedDuration = duration;
    
    if (Math.abs(distance) <= closeThreshold) {
        // Ajustar la duración para que sea más lenta cuando está cerca
        adjustedDuration = duration + 200; // Añadir 200ms adicionales
    }
    
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / adjustedDuration, 1);
        
        // Función de easing para un movimiento más natural
        const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        
        window.scrollTo(0, startPosition + distance * easeInOutQuad(progress));
        
        if (timeElapsed < adjustedDuration) {
            requestAnimationFrame(animation);
        } else {
            // Al finalizar, asegurarse de que el elemento está en el viewport
            targetElement.focus();
        }
    }
    
    requestAnimationFrame(animation);
}
// Funciones para localStorage - AÑADIR DESPUÉS DE LA DEFINICIÓN DE DATOS
function guardarDatos() {
    localStorage.setItem('pigmeaGmaoData', JSON.stringify(datos));
}

// 9. También necesitamos actualizar los datos existentes durante la carga inicial
// Modificar la función cargarDatos
function cargarDatos() {
    const datosGuardados = localStorage.getItem('pigmeaGmaoData');
    if (datosGuardados) {
        const datosParseados = JSON.parse(datosGuardados);
        // Actualizar el objeto datos con los valores guardados
        datos.equipamientos = datosParseados.equipamientos || [];
        
        // Añadir la propiedad lastModified a equipamientos que no la tengan
        datos.equipamientos.forEach(equipamiento => {
            if (!equipamiento.lastModified) {
                equipamiento.lastModified = new Date().toISOString();
            }
        });
        
        datos.planes = normalizarPlanes(datosParseados.planes);
        datos.preventivos = datosParseados.preventivos || [];
        datos.currentExportType = datosParseados.currentExportType;
        
        // Actualizar tablas
        actualizarTablaEquipamientos();
        actualizarTablaPlanes();
        actualizarTablaPreventivos();
    }
}

// Iniciar carga de datos cuando la página esté lista
// Modificar el listener DOMContentLoaded existente (línea 36)
document.addEventListener('DOMContentLoaded', function() {
    cargarDatos();

    actualizarSelectorPlanExistente();
    
    // Inicializar tablas ordenables
    hacerTablaOrdenable('tabla-planes', [0, 2]);
    hacerTablaOrdenable('tabla-preventivos', [0, 1, 2]);
});






// Funciones de utilidad
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) : text;
}

function validateDuration(duration) {
    const pattern = /^\d+:[0-5]\d:[0-5]\d$/;
    return pattern.test(duration);
}

function parseTabSeparatedValues(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => line.split('\t').map(item => item.trim()));
}


function escapeCSV(text) {
    if (text === null || text === undefined) return '';
    const t = String(text);
    
    // Si contiene comillas, comas o saltos de línea, escapar las comillas y envolver en comillas
    if (t.includes('"') || t.includes(',') || t.includes('\n')) {
        return t.replace(/"/g, '""');
    }
    return t;
}

// Función para abrir pestañas
function openTab(tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    
    // Limpiar estados de edición al cambiar pestañas
    const currentTab = document.querySelector(".tab-content.active")?.id;
    
    if (currentTab === 'equipamientos' && tabName !== 'equipamientos' && modoEdicionEquipamiento) {
        cancelarEdicionEquipamiento();
    }
    
    if (currentTab === 'planes' && tabName !== 'planes') {
        if (modoEdicionPlan) {
            cancelarEdicionPlan();
        }
        if (modoEdicionTarea) {
            cancelarEdicionTarea();
        }
        datos.tareasTemp = [];
    }
    
    if (currentTab === 'preventivos' && tabName !== 'preventivos' && modoEdicionPreventivo) {
        cancelarEdicionPreventivo();
    }
    
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`).classList.add('active');
    
    // Actualizar selectores cuando se cambia de pestaña
    if (tabName === 'planes') {
        actualizarSelectorEquipamientos('equipamiento-plan');
        actualizarSelectorPlanExistente();
    } else if (tabName === 'preventivos') {
        actualizarSelectorEquipamientos('equipamiento-preventivo');
        actualizarSelectorPlanes();
    }

    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`).classList.add('active');
    
     // Actualizar selectores cuando se cambia de pestaña
     if (tabName === 'planes') {
        actualizarSelectorEquipamientos('equipamiento-plan');
        actualizarContextoActual();
        destacarPlanesRelacionados(); // Añadir esta línea
    } else if (tabName === 'preventivos') {
        actualizarSelectorEquipamientos('equipamiento-preventivo');
        actualizarSelectorPlanes();
        destacarPreventivosRelacionados(); // Añadir esta línea
    }
}



let modoEdicionEquipamiento = null;

function editarEquipamiento(key) {
    const equipamiento = datos.equipamientos.find(e => e.key === key);
    if (!equipamiento) return;
    
    // Establecer modo edición
    modoEdicionEquipamiento = key;
    
    // Rellenar campos con datos actuales
    document.getElementById('prefijo-equipo').value = equipamiento.prefijo;
    document.getElementById('codigo-equipo').value = equipamiento.codigo;
    document.getElementById('descripcion-equipo').value = equipamiento.descripcion;
    
    // Cambiar el texto del botón
    const btnAgregar = document.querySelector('#equipamientos .action-button');
    btnAgregar.textContent = 'Actualizar Equipamiento';
    btnAgregar.onclick = function() {
        actualizarEquipamiento();
    };
    
    // Añadir botón para cancelar edición
    if (!document.getElementById('cancelar-edicion-equipamiento')) {
        const btnCancelar = document.createElement('button');
        btnCancelar.id = 'cancelar-edicion-equipamiento';
        btnCancelar.className = 'action-button cancel-button';
        btnCancelar.textContent = 'Cancelar Edición';
        btnCancelar.onclick = function() {
            cancelarEdicionEquipamiento();
        };
        btnAgregar.parentNode.insertBefore(btnCancelar, btnAgregar.nextSibling);
    }
    
    // Usar la función de desplazamiento personalizada
    scrollSmoothly(document.getElementById('prefijo-equipo'));
}

function actualizarEquipamiento() {
    if (!modoEdicionEquipamiento) return;
    
    const prefijo = document.getElementById('prefijo-equipo').value.trim();
    const codigo = document.getElementById('codigo-equipo').value.trim();
    const descripcion = document.getElementById('descripcion-equipo').value.trim();
    
    if (!prefijo || !codigo || !descripcion) {
        alert('Por favor, complete todos los campos del equipamiento.');
        return;
    }
    
    const newKey = `${prefijo}-${codigo}`;
    
    // Si la clave cambia, verificar que no exista otra igual
    if (newKey !== modoEdicionEquipamiento && datos.equipamientos.some(e => e.key === newKey)) {
        alert('Ya existe un equipamiento con esta clave.');
        return;
    }
    
    // Verificar si el equipamiento está en uso en planes o preventivos
    const enUsoPlan = datos.planes.some(plan => planAsociadoA(plan, modoEdicionEquipamiento));
    const enUsoPreventivo = datos.preventivos.some(prev => prev.asset === modoEdicionEquipamiento);
    
    // Si está en uso y la clave va a cambiar, avisar y cancelar
    if ((enUsoPlan || enUsoPreventivo) && newKey !== modoEdicionEquipamiento) {
        alert('No puede cambiar la clave porque este equipamiento está siendo utilizado en planes o preventivos.');
        return;
    }
    
    // Actualizar el equipamiento
    const index = datos.equipamientos.findIndex(e => e.key === modoEdicionEquipamiento);
    if (index !== -1) {
        datos.equipamientos[index] = {
            key: newKey,
            prefijo,
            codigo,
            descripcion: truncateText(descripcion, 100),
            lastModified: new Date().toISOString() // Agregar fecha de modificación
        };
        
        // Si la clave cambió, actualizar referencias en planes y preventivos
        if (newKey !== modoEdicionEquipamiento) {
            datos.planes.forEach(plan => {
                if (planAsociadoA(plan, modoEdicionEquipamiento)) {
                    plan.equipamientos = plan.equipamientos.map(k => k === modoEdicionEquipamiento ? newKey : k);
                }
            });
            
            datos.preventivos.forEach(prev => {
                if (prev.asset === modoEdicionEquipamiento) {
                    prev.asset = newKey;
                }
            });
        }
        
        actualizarTablaEquipamientos();
        actualizarSelectorEquipamientos('equipamiento-plan');
        actualizarSelectorEquipamientos('equipamiento-preventivo');
        cancelarEdicionEquipamiento();
    }
    guardarDatos();
}

function actualizarFechaModificacionEquipamiento(equipamientoKey) {
    const index = datos.equipamientos.findIndex(e => e.key === equipamientoKey);
    if (index !== -1) {
        datos.equipamientos[index].lastModified = new Date().toISOString();
        guardarDatos();
    }
}

function cancelarEdicionEquipamiento() {
    modoEdicionEquipamiento = null;
    
    // Limpiar formulario
    document.getElementById('prefijo-equipo').value = '';
    document.getElementById('codigo-equipo').value = '';
    document.getElementById('descripcion-equipo').value = '';
    
    // Restaurar el botón a estado original
    const btnAgregar = document.querySelector('#equipamientos .action-button');
    btnAgregar.textContent = 'Agregar Equipamiento';
    btnAgregar.onclick = function() {
        agregarEquipamiento();
    };
    
    // Eliminar botón cancelar
    const btnCancelar = document.getElementById('cancelar-edicion-equipamiento');
    if (btnCancelar) btnCancelar.remove();
}





// Funciones para Equipamientos
function agregarEquipamiento() {
    const prefijo = document.getElementById('prefijo-equipo').value.trim();
    const codigo = document.getElementById('codigo-equipo').value.trim();
    const descripcion = document.getElementById('descripcion-equipo').value.trim();
    
    if (!prefijo || !codigo || !descripcion) {
        alert('Por favor, complete todos los campos del equipamiento.');
        return;
    }
    
    const key = `${prefijo}-${codigo}`;
    
    // Verificar si ya existe un equipamiento con la misma clave
    if (datos.equipamientos.some(e => e.key === key)) {
        alert('Ya existe un equipamiento con esta clave.');
        return;
    }
    
    const equipamiento = {
        key,
        prefijo,
        codigo,
        descripcion: truncateText(descripcion, 100)
    };
    
    datos.equipamientos.push(equipamiento);
    actualizarTablaEquipamientos();
    
    // Limpiar formulario
    document.getElementById('prefijo-equipo').value = '';
    document.getElementById('codigo-equipo').value = '';
    document.getElementById('descripcion-equipo').value = '';

    guardarDatos();
}

function eliminarEquipamiento(key) {
    // Verificar si el equipamiento está en uso en planes o preventivos
    const enUsoPlan = datos.planes.some(plan => planAsociadoA(plan, key));
    const enUsoPreventivo = datos.preventivos.some(prev => prev.asset === key);
    
    if (enUsoPlan || enUsoPreventivo) {
        alert('No se puede eliminar este equipamiento porque está siendo utilizado en planes o preventivos.');
        return;
    }
    
    datos.equipamientos = datos.equipamientos.filter(e => e.key !== key);
    actualizarTablaEquipamientos();
    
    // Actualizar selectores
    actualizarSelectorEquipamientos('equipamiento-plan');
    actualizarSelectorEquipamientos('equipamiento-preventivo');
    guardarDatos();
}

function actualizarTablaEquipamientos() {
    const tbody = document.getElementById('equipamientos-body');
    tbody.innerHTML = '';
    
    datos.equipamientos.forEach(equipamiento => {
        const tr = document.createElement('tr');
        
        const tdKey = document.createElement('td');
        tdKey.textContent = equipamiento.key;
        
        const tdDesc = document.createElement('td');
        tdDesc.textContent = equipamiento.descripcion;
        
        // Nueva columna de estado
        const tdEstado = document.createElement('td');
        
        // Verificar si tiene plan de mantenimiento
        const tienePlan = datos.planes.some(plan => planAsociadoA(plan, equipamiento.key));
        
        // Verificar si tiene preventivo
        const tienePreventivo = datos.preventivos.some(prev => prev.asset === equipamiento.key);
        
        // Establecer el estado según los indicadores
        tdEstado.textContent = `${tienePlan ? '✅' : '❌'} | ${tienePreventivo ? '✅' : '❌'}`;
        tdEstado.className = 'estado-equipamiento';
        
        // Agregar columna de última modificación
        const tdLastModified = document.createElement('td');
        if (equipamiento.lastModified) {
            const fecha = new Date(equipamiento.lastModified);
            tdLastModified.textContent = formatearFecha(fecha);
        } else {
            tdLastModified.textContent = 'No disponible';
        }
        
        const tdActions = document.createElement('td');
        
        // Botón de edición
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.textContent = 'Editar';
        editBtn.onclick = () => editarEquipamiento(equipamiento.key);
        tdActions.appendChild(editBtn);
        
        // Botón de eliminación
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = () => eliminarEquipamiento(equipamiento.key);
        tdActions.appendChild(deleteBtn);
        
        tr.appendChild(tdKey);
        tr.appendChild(tdDesc);
        tr.appendChild(tdEstado);
        tr.appendChild(tdLastModified); // Agregar nueva columna
        tr.appendChild(tdActions);
        
        tbody.appendChild(tr);
    });
}


// 3. Agregar una función para formatear la fecha de manera legible
function formatearFecha(fecha) {
    const opciones = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
    };
    return fecha.toLocaleString(undefined, opciones);
}




function actualizarSelectorEquipamientos(selectorId) {
    const selector = document.getElementById(selectorId);
    selector.innerHTML = '<option value="">-- Todos los equipamientos --</option>';
    
    datos.equipamientos.forEach(equipamiento => {
        // Verificar si el equipamiento tiene un plan de mantenimiento
        const tienePlan = datos.planes.some(plan => planAsociadoA(plan, equipamiento.key));
        
        // Verificar si el equipamiento tiene un preventivo
        const tienePreventivo = datos.preventivos.some(prev => prev.asset === equipamiento.key);
        
        // Crear el indicador apropiado según el tipo de selector
        let indicador = '';
        if (selectorId === 'equipamiento-plan') {
            indicador = tienePlan ? ' ✅' : ' ❌';
        } else if (selectorId === 'equipamiento-preventivo') {
            indicador = tienePreventivo ? ' ✅' : ' ❌';
        }
        
        const option = document.createElement('option');
        option.value = equipamiento.key;
        option.textContent = `${equipamiento.key} - ${equipamiento.descripcion}${indicador}`;
        selector.appendChild(option);
    });
}

// Función para buscar en la tabla de equipamientos
function buscarEquipamientos() {
    const textoBusqueda = document.getElementById('buscar-equipamiento').value.toLowerCase();
    const filas = document.querySelectorAll('#equipamientos-body tr');
    
    filas.forEach(fila => {
        const textoEquipamiento = fila.cells[0].textContent.toLowerCase(); // Key
        const textoDescripcion = fila.cells[1].textContent.toLowerCase();  // Descripción
        
        // Mostrar la fila si el texto de búsqueda está en cualquier campo
        if (textoEquipamiento.includes(textoBusqueda) || textoDescripcion.includes(textoBusqueda)) {
            fila.classList.remove('hidden-row');
        } else {
            fila.classList.add('hidden-row');
        }
    });
}

function actualizarSelectorPlanes() {
    const selector = document.getElementById('planes-preventivo');
    selector.innerHTML = '';

    // Obtener el equipamiento seleccionado
    const equipamientoKey = document.getElementById('equipamiento-preventivo').value;

    // Obtener planes disponibles según configuración
    const planesFiltrados = obtenerPlanesDisponibles(equipamientoKey);

    planesFiltrados.forEach(plan => {
        // Verificar si el plan tiene un preventivo asociado a este equipamiento
        const tienePreventivo = equipamientoKey && datos.preventivos.some(prev =>
            prev.asset === equipamientoKey &&
            prev.plannedWork.some(pw => pw.maintenancePlan === plan.planKey)
        );
        
        const indicador = tienePreventivo ? ' ✅' : ' ❌';
        
        const option = document.createElement('option');
        option.value = plan.planKey;
        option.textContent = `${plan.planKey} - ${plan.descripcion}${indicador}`;
        selector.appendChild(option);
    });
}

function actualizarSelectorPlanExistente() {
    const selector = document.getElementById('plan-existente');
    if (!selector) return;
    selector.innerHTML = '<option value="">-- Seleccionar Plan --</option>';
    const unique = new Map();
    datos.planes.forEach(p => {
        if (!unique.has(p.planKey)) {
            unique.set(p.planKey, p);
        }
    });
    unique.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.planKey;
        option.textContent = `${plan.planKey} - ${plan.descripcion}`;
        selector.appendChild(option);
    });
}

function asignarPlanAEquipamiento() {
    const equipamientoKey = document.getElementById('equipamiento-plan').value;
    const selector = document.getElementById('plan-existente');
    const seleccionados = Array.from(selector.selectedOptions)
        .map(opt => opt.value)
        .filter(v => v);

    if (!equipamientoKey || seleccionados.length === 0) {
        alert('Seleccione un equipamiento y al menos un plan existente.');
        return;
    }

    seleccionados.forEach(planKey => {
        vincularPlanConEquipo(planKey, equipamientoKey);
    });
    actualizarTablaPlanes();
    actualizarSelectorPlanes();
    actualizarSelectorPlanExistente();
    actualizarContextoActual();
    guardarDatos();

    alert('Planes asignados correctamente.');
}


function agregarTarea() {
    const taskKey = document.getElementById('task-key').value.trim();
    const descripcion = document.getElementById('task-descripcion').value.trim();
    const duracion = document.getElementById('task-duracion').value.trim();
    
    if (!taskKey || !descripcion || !duracion) {
        alert('Por favor, complete todos los campos de la tarea.');
        return;
    }
    
    if (!validateDuration(duracion)) {
        alert(`Formato de duración incorrecto. Debe ser H:MM:SS`);
        return;
    }
    
    // Verificar si ya existe una tarea con la misma clave
    if (datos.tareasTemp.some(t => t.taskKey === taskKey)) {
        alert('Ya existe una tarea con esta clave.');
        return;
    }
    
    const tarea = {
        taskKey,
        descripcion: truncateText(descripcion, 100),
        duracion
    };
    
    datos.tareasTemp.push(tarea);
    actualizarTablaTareas();
    
    // Limpiar campos de tarea
    document.getElementById('task-key').value = '';
    document.getElementById('task-descripcion').value = '';
    document.getElementById('task-duracion').value = '';
    guardarDatos();
}

function eliminarTarea(taskKey) {
    datos.tareasTemp = datos.tareasTemp.filter(t => t.taskKey !== taskKey);
    actualizarTablaTareas();
    guardarDatos();
}

function actualizarTablaTareas() {
    const tbody = document.getElementById('tareas-body');
    tbody.innerHTML = '';

        // Actualizar el encabezado de la sección de tareas
        const taskTableTitle = document.querySelector('.task-table-container').previousElementSibling;
        const equipamientoKey = document.getElementById('equipamiento-plan').value;
        
        if (equipamientoKey) {
            const equipamiento = datos.equipamientos.find(e => e.key === equipamientoKey);
            if (equipamiento) {
                taskTableTitle.textContent = `Tareas para ${equipamiento.key} - ${modoEdicionPlan ? 'Plan: ' + modoEdicionPlan.planKey : 'Nuevo Plan'}`;
            }
        } else {
            taskTableTitle.textContent = "Tareas cargadas";
        }
    
    datos.tareasTemp.forEach(tarea => {
        const tr = document.createElement('tr');
        
        const tdKey = document.createElement('td');
        tdKey.textContent = tarea.taskKey;
        
        const tdDesc = document.createElement('td');
        tdDesc.textContent = tarea.descripcion;
        
        const tdDuracion = document.createElement('td');
        tdDuracion.textContent = tarea.duracion;
        
        const tdActions = document.createElement('td');
        
        // Botón de edición
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.textContent = 'Editar';
        editBtn.onclick = () => editarTarea(tarea.taskKey);
        tdActions.appendChild(editBtn);
        
        // Botón de eliminación
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = () => eliminarTarea(tarea.taskKey);
        tdActions.appendChild(deleteBtn);
        
        tr.appendChild(tdKey);
        tr.appendChild(tdDesc);
        tr.appendChild(tdDuracion);
        tr.appendChild(tdActions);
        
        tbody.appendChild(tr);
    });
}












// Funciones para Planes de Mantenimiento
function agregarPlanMantenimiento() {
    const equipamientoKey = document.getElementById('equipamiento-plan').value;
    const planKey = document.getElementById('plan-key').value.trim();
    const periodicidad = document.getElementById('periodicidad').value;
    
    if (!equipamientoKey || !planKey || !periodicidad) {
        alert('Por favor, complete los campos requeridos del plan de mantenimiento.');
        return;
    }
    
    if (datos.tareasTemp.length === 0) {
        alert('Por favor, ingrese al menos una tarea.');
        return;
    }

    // Verificar si ya existe un plan con la misma clave
    const existe = datos.planes.some(p => p.planKey === planKey);
    if (existe) {
        alert('Ya existe un plan con esta clave.');
        return;
    }
    
    // Encontrar el equipamiento seleccionado
    const equipamiento = datos.equipamientos.find(e => e.key === equipamientoKey);
    if (!equipamiento) {
        alert('El equipamiento seleccionado no es válido.');
        return;
    }
    if (equipamientoKey) { // Solo actualizar si es un equipamiento específico (no "Todos")
        actualizarFechaModificacionEquipamiento(equipamientoKey);
    }
    
    const descripcionPlan = `${equipamiento.descripcion} - ${periodicidad}`;
    
    const plan = {
        planKey,
        descripcion: truncateText(descripcionPlan, 100),
        periodicidad,
        tareas: [...datos.tareasTemp],
        equipamientos: [equipamientoKey]
    };

    datos.planes.push(plan);
    actualizarTablaPlanes();
    actualizarSelectorPlanExistente();
    actualizarContextoActual();
    
    // Limpiar formulario
    document.getElementById('plan-key').value = '';
    document.getElementById('periodicidad').value = '';
    datos.tareasTemp = []; // Limpiar tareas temporales
    actualizarTablaTareas(); // Actualizar tabla de tareas
    guardarDatos();






}

function eliminarPlan(planKey, equipamientoKey) {
    const plan = datos.planes.find(p => p.planKey === planKey);
    if (!plan) return;

    // Verificar si el plan está en uso en preventivos para ese equipamiento
    const enUso = datos.preventivos.some(prev => {
        return prev.asset === equipamientoKey && prev.plannedWork.some(pw => pw.maintenancePlan === planKey);
    });

    if (enUso) {
        alert('No se puede eliminar este plan porque está siendo utilizado en preventivos.');
        return;
    }

    if (equipamientoKey) {
        plan.equipamientos = plan.equipamientos.filter(k => k !== equipamientoKey);
        actualizarFechaModificacionEquipamiento(equipamientoKey);
    }

    if (plan.equipamientos.length === 0) {
        datos.planes = datos.planes.filter(p => p.planKey !== planKey);
    }
    
    actualizarTablaPlanes();
    actualizarSelectorPlanes();
    actualizarSelectorPlanExistente();
    actualizarContextoActual();
    guardarDatos();
}

function actualizarTablaPlanes() {
    const tbody = document.getElementById('planes-body');
    tbody.innerHTML = '';
    
    datos.planes.forEach(plan => {
        plan.equipamientos.forEach(eqKey => {
            const tr = document.createElement('tr');
            tr.dataset.equipKey = eqKey;

            const tdKey = document.createElement('td');
            tdKey.textContent = plan.planKey;

            const tdEquip = document.createElement('td');
            tdEquip.textContent = eqKey;

            const tdDesc = document.createElement('td');
            tdDesc.textContent = plan.descripcion;

            const tdTareas = document.createElement('td');
            tdTareas.textContent = `${plan.tareas.length} tarea(s)`;

            const tdActions = document.createElement('td');

            const editBtn = document.createElement('button');
            editBtn.className = 'edit-button';
            editBtn.textContent = 'Editar';
            editBtn.onclick = () => editarPlan(plan.planKey, eqKey);
            tdActions.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.onclick = () => eliminarPlan(plan.planKey, eqKey);
            tdActions.appendChild(deleteBtn);

            tr.appendChild(tdKey);
            tr.appendChild(tdEquip);
            tr.appendChild(tdDesc);
            tr.appendChild(tdTareas);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });
    });
    destacarPlanesRelacionados();
    
    // Hacer la tabla ordenable (solo después de llenar datos)
    hacerTablaOrdenable('tabla-planes', [0, 2]); // Permitir ordenar por ID y descripción
}

function actualizarSelectorPlanes() {
    const selector = document.getElementById('planes-preventivo');
    selector.innerHTML = '';

    // Obtener el equipamiento seleccionado
    const equipamientoKey = document.getElementById('equipamiento-preventivo').value;

    // Obtener planes disponibles según configuración
    const planesFiltrados = obtenerPlanesDisponibles(equipamientoKey);

    planesFiltrados.forEach(plan => {
        // Verificar si el plan tiene un preventivo asociado a este equipamiento
        const tienePreventivo = equipamientoKey && datos.preventivos.some(prev =>
            prev.asset === equipamientoKey &&
            prev.plannedWork.some(pw => pw.maintenancePlan === plan.planKey)
        );
        
        const indicador = tienePreventivo ? ' ✅' : ' ❌';
        
        const option = document.createElement('option');
        option.value = plan.planKey;
        option.textContent = `${plan.planKey} - ${plan.descripcion}${indicador}`;
        selector.appendChild(option);
    });
}

// Funciones para Preventivos
function actualizarFrecuencias() {
    const planesSeleccionados = Array.from(document.getElementById('planes-preventivo').selectedOptions)
        .map(option => option.value);
    
    const container = document.getElementById('frecuencias-container');
    container.innerHTML = '';
    
    if (planesSeleccionados.length > 0) {
        planesSeleccionados.forEach(planKey => {
            const plan = datos.planes.find(p => p.planKey === planKey);
            if (!plan) return;
            
            const div = document.createElement('div');
            div.className = 'frequency-row';
            
            const span = document.createElement('span');
            span.textContent = `${plan.planKey}:`;
            div.appendChild(span);
            
            const selectFrequency = document.createElement('select');
            selectFrequency.id = `frequency-${planKey}`;
            selectFrequency.required = true;
            
            const optionDaily = document.createElement('option');
            optionDaily.value = 'Daily';
            optionDaily.textContent = 'Daily';
            selectFrequency.appendChild(optionDaily);
            
            const optionWeekly = document.createElement('option');
            optionWeekly.value = 'Weekly';
            optionWeekly.textContent = 'Weekly';
            selectFrequency.appendChild(optionWeekly);
            
            const optionMonthly = document.createElement('option');
            optionMonthly.value = 'Monthly';
            optionMonthly.textContent = 'Monthly';
            selectFrequency.appendChild(optionMonthly);
            
            // Seleccionar valor y occursEvery basado en la periodicidad
            const { frequency, occursEvery } = getFrequencyConfig(plan.periodicidad);
            if (frequency === 'Daily') {
                optionDaily.selected = true;
            } else if (frequency === 'Weekly') {
                optionWeekly.selected = true;
            } else {
                optionMonthly.selected = true;
            }
            
            div.appendChild(selectFrequency);
            
            const inputOccurs = document.createElement('input');
            inputOccurs.type = 'number';
            inputOccurs.id = `occurs-${planKey}`;
            inputOccurs.min = '1';
            inputOccurs.required = true;
            
            // Valor predeterminado para occursEvery
            inputOccurs.value = occursEvery;
            
            div.appendChild(inputOccurs);
            
            container.appendChild(div);
        });
    }
}

document.getElementById('equipamiento-preventivo').addEventListener('change', function() {
    actualizarSelectorPlanes();
    actualizarFrecuencias();
    destacarPreventivosRelacionados();
});

document.getElementById('planes-preventivo').addEventListener('change', function() {
    actualizarFrecuencias();
});
function agregarPreventivo() {
    const idInicial = parseInt(document.getElementById('id-inicial').value);
    const equipamientoKey = document.getElementById('equipamiento-preventivo').value;
    const planesSeleccionados = Array.from(document.getElementById('planes-preventivo').selectedOptions)
        .map(option => option.value);
    
    if (!equipamientoKey) {
        alert('Por favor, seleccione un equipamiento.');
        return;
    }
    
    if (planesSeleccionados.length === 0) {
        alert('Por favor, seleccione al menos un plan de mantenimiento.');
        return;
    }
    
    // Verificar que las frecuencias estén configuradas correctamente
    const frecuencias = [];
    for (const planKey of planesSeleccionados) {
        const frequency = document.getElementById(`frequency-${planKey}`).value;
        const occursEvery = parseInt(document.getElementById(`occurs-${planKey}`).value);
        
        if (!frequency || isNaN(occursEvery) || occursEvery < 1) {
            alert(`Por favor, configure correctamente la frecuencia para el plan ${planKey}.`);
            return;
        }
        
        frecuencias.push({
            planKey,
            frequency,
            occursEvery
        });
    }
    
    // Encontrar el equipamiento seleccionado
    const equipamiento = datos.equipamientos.find(e => e.key === equipamientoKey);
    if (!equipamiento) {
        alert('El equipamiento seleccionado no es válido.');
        return;
    }
    
    // Generar ID para el preventivo
    let idPreventivo = idInicial;
    if (datos.preventivos.length > 0) {
        // Si ya hay preventivos, usar el siguiente ID disponible
        const maxId = Math.max(...datos.preventivos.map(p => p.id));
        idPreventivo = Math.max(idInicial, maxId + 1);
    }
    
    const preventiveMaintenanceId = `PR${idPreventivo.toString().padStart(7, '0')}`;
    const descripcionPreventivo = `Prev. ${equipamiento.descripcion} (${equipamiento.prefijo})`;
    
    const plannedWork = frecuencias.map(f => {
        const plan = datos.planes.find(p => p.planKey === f.planKey);
        return {
            preventiveMaintenanceId,
            maintenancePlan: f.planKey,
            frequency: f.frequency,
            occursEvery: f.occursEvery
        };
    });
    
    const preventivo = {
        id: idPreventivo,
        preventiveMaintenanceId,
        descripcion: truncateText(descripcionPreventivo, 100),
        asset: equipamientoKey,
        plannedWork
    };

    if (equipamientoKey) { // Solo actualizar si es un equipamiento específico (no "Todos")
        actualizarFechaModificacionEquipamiento(equipamientoKey);
    }
    
    datos.preventivos.push(preventivo);
    actualizarTablaPreventivos();
    
    // Actualizar el valor de ID inicial para el próximo preventivo
    document.getElementById('id-inicial').value = idPreventivo + 1;
    guardarDatos();
    // Actualizar selectores con los nuevos indicadores
actualizarSelectorEquipamientos('equipamiento-plan');
actualizarSelectorEquipamientos('equipamiento-preventivo');
actualizarTablaEquipamientos();
}

function eliminarPreventivo(id) {
    // Guardar referencia al equipamiento antes de eliminar el preventivo
    const preventivo = datos.preventivos.find(p => p.id === id);
    if (preventivo) {
        const equipamientoKey = preventivo.asset;
        
        // Eliminar el preventivo
        datos.preventivos = datos.preventivos.filter(p => p.id !== id);
        
        // Actualizar fecha de modificación del equipamiento relacionado
        actualizarFechaModificacionEquipamiento(equipamientoKey);
    } else {
        datos.preventivos = datos.preventivos.filter(p => p.id !== id);
    }
    
    actualizarTablaPreventivos();
    guardarDatos();
}

function actualizarTablaPreventivos() {
    const tbody = document.getElementById('preventivos-body');
    tbody.innerHTML = '';
    
    datos.preventivos.forEach(preventivo => {
        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        tdId.textContent = preventivo.preventiveMaintenanceId;
        
        const tdDesc = document.createElement('td');
        tdDesc.textContent = preventivo.descripcion;
        
        const tdAsset = document.createElement('td');
        tdAsset.textContent = preventivo.asset;
        
        const tdPlanes = document.createElement('td');
        const planesTexto = preventivo.plannedWork.map(pw => pw.maintenancePlan).join(', ');
        tdPlanes.textContent = planesTexto;
        
        const tdActions = document.createElement('td');
        
        // Botón de edición
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.textContent = 'Editar';
        editBtn.onclick = () => editarPreventivo(preventivo.id);
        tdActions.appendChild(editBtn);
        
        // Botón de eliminación
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = () => eliminarPreventivo(preventivo.id);
        tdActions.appendChild(deleteBtn);
        
        tr.appendChild(tdId);
        tr.appendChild(tdDesc);
        tr.appendChild(tdAsset);
        tr.appendChild(tdPlanes);
        tr.appendChild(tdActions);
        
        tbody.appendChild(tr);
    });
    destacarPreventivosRelacionados();
    
    // Hacer la tabla ordenable (solo después de llenar datos)
    hacerTablaOrdenable('tabla-preventivos', [0, 1, 2]); // Permitir ordenar por ID, descripción y asset
}


function copiarAlPortapapeles() {
    const previewText = document.getElementById('preview-text');
    navigator.clipboard.writeText(previewText.textContent)
        .then(() => {
            alert('Texto copiado al portapapeles.');
        })
        .catch(err => {
            console.error('Error al copiar: ', err);
            alert('No se pudo copiar el texto. Por favor, selecciónelo manualmente y use Ctrl+C.');
        });
}

function descargarCSV() {
    if (!datos.currentExportType) return;
    
    const previewText = document.getElementById('preview-text').textContent;
    const blob = new Blob([previewText], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${datos.currentExportType}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// Función para exportar todos los datos a un archivo JSON
function exportarTodosDatos() {
    // Crear una copia limpia de los datos
    const datosExport = {
        version: "1.0",
        fecha: new Date().toISOString(),
        contenido: {
            equipamientos: datos.equipamientos,
            planes: datos.planes,
            preventivos: datos.preventivos
        }
    };
    
    // Convertir a JSON formateado
    const jsonData = JSON.stringify(datosExport, null, 2);
    
    // Crear un objeto Blob con los datos
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Generar un nombre de archivo basado en la fecha
    const fechaHora = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const nombreArchivo = `pigmeaGMAO_backup_${fechaHora}.json`;
    
    // Crear un enlace para descargar el archivo
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    
    // Agregar a la página, hacer clic y eliminar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Archivo de datos exportado correctamente.');
}

// Función para importar datos desde un archivo JSON
function importarDatos(files) {
    if (!files || !files[0]) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            const datosImportados = JSON.parse(event.target.result);
            

            if (!validarDatosImportados(datosImportados)) {
                throw new Error('Datos inválidos en el archivo.');
            }
            // Validar la estructura básica del archivo
            if (!datosImportados.contenido || 
                !datosImportados.contenido.equipamientos || 
                !datosImportados.contenido.planes || 
                !datosImportados.contenido.preventivos) {
                throw new Error('El archivo no tiene el formato esperado.');
            }
            
            // Mostrar confirmación al usuario
            if (confirm('¿Está seguro de que desea importar estos datos? Se reemplazarán los datos actuales.')) {
                // Reemplazar los datos actuales
                datos.equipamientos = datosImportados.contenido.equipamientos;
                datos.planes = normalizarPlanes(datosImportados.contenido.planes);
                datos.preventivos = datosImportados.contenido.preventivos;
                
                // Guardar en localStorage
                guardarDatos();
                
                // Actualizar todas las tablas
                actualizarTablaEquipamientos();
                actualizarTablaPlanes();
                actualizarTablaPreventivos();
                actualizarSelectorEquipamientos('equipamiento-plan');
                actualizarSelectorEquipamientos('equipamiento-preventivo');
                
                alert('Datos importados correctamente.');
            }
            
        } catch (error) {
            alert('Error al importar el archivo: ' + error.message);
            console.error('Error al importar:', error);
        }
        
        // Limpiar el input de archivo para permitir seleccionar el mismo archivo nuevamente
        document.getElementById('importar-archivo').value = '';
    };
    
    reader.readAsText(file);
}

function validarDatosImportados(datosImportados) {
    // Verificar versión si es necesario
    if (datosImportados.version && parseFloat(datosImportados.version) > 1.0) {
        console.warn('El archivo fue creado con una versión más reciente de la aplicación.');
    }
    
    // Validar equipamientos
    if (!Array.isArray(datosImportados.contenido.equipamientos)) {
        throw new Error('El formato de equipamientos es inválido.');
    }
    
    // Validar planes
    if (!Array.isArray(datosImportados.contenido.planes)) {
        throw new Error('El formato de planes es inválido.');
    }
    
    // Validar preventivos
    if (!Array.isArray(datosImportados.contenido.preventivos)) {
        throw new Error('El formato de preventivos es inválido.');
    }
    
    // Validar estructura de cada elemento (opcional)
    datosImportados.contenido.equipamientos.forEach((equip, index) => {
        if (!equip.key || !equip.prefijo || !equip.codigo || !equip.descripcion) {
            throw new Error(`Equipamiento #${index+1} tiene un formato inválido.`);
        }
    });
    
    // Similar para planes y preventivos si deseas ese nivel de validación
    
    return true;
}




let modoEdicionPlan = null;

function editarPlan(planKey, equipamientoKey) {
    const plan = datos.planes.find(p => p.planKey === planKey);
    if (!plan) return;

    // Determinar el equipamiento a editar. Si no se provee, se toma el primero
    const eqKey = equipamientoKey || plan.equipamientos[0];

    plan.equipamientos.forEach(actualizarFechaModificacionEquipamiento);

    // Establecer modo edición guardando el plan y el equipamiento asociados
    modoEdicionPlan = { planKey: plan.planKey, equipamientoKey: eqKey };

    // Rellenar campos con datos actuales
    document.getElementById('equipamiento-plan').value = eqKey || '';
    document.getElementById('plan-key').value = plan.planKey;
    document.getElementById('periodicidad').value = plan.periodicidad;
    // Actualizar contexto
    actualizarContextoActual();

    // Bloquear cambio de equipamiento durante edición
    document.getElementById('equipamiento-plan').disabled = true;

    // Cargar las tareas del plan en tareasTemp
    datos.tareasTemp = JSON.parse(JSON.stringify(plan.tareas)); // Copia profunda de las tareas
    actualizarTablaTareas();
    
    // Cambiar el texto del botón de agregar plan
    const btnAgregarPlan = document.querySelector('#planes > button.action-button');
    btnAgregarPlan.textContent = 'Actualizar Plan';
    btnAgregarPlan.onclick = actualizarPlan;
    
    // Añadir botón para cancelar edición
    if (!document.getElementById('cancelar-edicion-plan')) {
        const btnCancelar = document.createElement('button');
        btnCancelar.id = 'cancelar-edicion-plan';
        btnCancelar.className = 'action-button cancel-button';
        btnCancelar.textContent = 'Cancelar Edición';
        btnCancelar.onclick = cancelarEdicionPlan;
        btnAgregarPlan.parentNode.insertBefore(btnCancelar, btnAgregarPlan.nextSibling);
    }
    
    // Usar la función de desplazamiento personalizada
    scrollSmoothly(document.getElementById('equipamiento-plan'));
    setTimeout(() => document.getElementById('plan-key').focus(), 850); // Dar tiempo para el desplazamiento
}

function actualizarPlan() {
    if (!modoEdicionPlan) return;

    const planKey = document.getElementById('plan-key').value.trim();
    const periodicidad = document.getElementById('periodicidad').value;

    if (!planKey || !periodicidad) {
        alert('Por favor, complete los campos requeridos del plan de mantenimiento.');
        return;
    }
    
    if (datos.tareasTemp.length === 0) {
        alert('Por favor, ingrese al menos una tarea.');
        return;
    }
    
    // Si la clave cambia, verificar que no exista otra igual
    if (planKey !== modoEdicionPlan.planKey && datos.planes.some(p => p.planKey === planKey)) {
        alert('Ya existe un plan con esta clave.');
        return;
    }
    
    // Verificar si el plan está en uso en preventivos
    const enUso = datos.preventivos.some(prev =>
        prev.plannedWork.some(pw => pw.maintenancePlan === modoEdicionPlan.planKey)
    );
    // Si está en uso y la clave va a cambiar, avisar y cancelar
    if (enUso && planKey !== modoEdicionPlan.planKey) {
        alert('No puede cambiar la clave del plan porque está siendo utilizado en preventivos.');
        return;
    }
    const plan = datos.planes.find(p => p.planKey === modoEdicionPlan.planKey);
    if (plan) {
        const equipamiento = datos.equipamientos.find(e => e.key === plan.equipamientos[0]);
        const descripcionPlan = equipamiento ? `${equipamiento.descripcion} - ${periodicidad}` : plan.descripcion;

        plan.planKey = planKey;
        plan.descripcion = truncateText(descripcionPlan, 100);
        plan.periodicidad = periodicidad;
        plan.tareas = [...datos.tareasTemp];

        // Si la clave cambió, actualizar referencias en preventivos
        if (planKey !== modoEdicionPlan.planKey) {
            datos.preventivos.forEach(prev => {
                if (prev.asset === modoEdicionPlan.equipamientoKey) {
                    prev.plannedWork.forEach(pw => {
                        if (pw.maintenancePlan === modoEdicionPlan.planKey) {
                            pw.maintenancePlan = planKey;
                        }
                    });
                }
            });
        }

        plan.equipamientos.forEach(actualizarFechaModificacionEquipamiento);

        actualizarTablaPlanes();
        actualizarSelectorPlanes();
        actualizarSelectorPlanExistente();
        actualizarContextoActual();
        cancelarEdicionPlan();
    }
    guardarDatos();
}

function cancelarEdicionPlan() {
    modoEdicionPlan = null;
    
    // Limpiar formulario
    document.getElementById('plan-key').value = '';
    document.getElementById('periodicidad').value = '';
    datos.tareasTemp = [];
    actualizarTablaTareas();
    
    // Restaurar el botón a estado original (el que está fuera de la carga masiva)
    const btnAgregarPlan = document.querySelector('#planes > button.action-button');
    if (btnAgregarPlan) {
        btnAgregarPlan.textContent = 'Agregar Plan';
        btnAgregarPlan.onclick = agregarPlanMantenimiento;
    }
    
    // Eliminar botón cancelar
    const btnCancelar = document.getElementById('cancelar-edicion-plan');
    if (btnCancelar) btnCancelar.remove();

    // Desbloquear selector de equipamiento
    document.getElementById('equipamiento-plan').disabled = false;
    
    // Actualizar contexto
    actualizarContextoActual();
    



}



// Corregir la función editarPreventivo
let modoEdicionPreventivo = null;

function editarPreventivo(id) {
    const preventivo = datos.preventivos.find(p => p.id === id);
    if (!preventivo) return;
    // Añadir esta línea para actualizar la fecha del equipamiento cuando se edita un preventivo
    actualizarFechaModificacionEquipamiento(preventivo.asset);
    // Establecer modo edición
    modoEdicionPreventivo = id;
    
    // Rellenar campos
    document.getElementById('equipamiento-preventivo').value = preventivo.asset;
    
    // Actualizar selector de planes basado en el equipamiento
    actualizarSelectorPlanes();
    
    // Seleccionar planes que están en uso en el preventivo
    const planesSeleccionados = preventivo.plannedWork.map(pw => pw.maintenancePlan);
    const planesSelect = document.getElementById('planes-preventivo');
    
    Array.from(planesSelect.options).forEach(option => {
        option.selected = planesSeleccionados.includes(option.value);
    });
    
    // Actualizar contenedor de frecuencias
    actualizarFrecuencias();
    
    // Una vez que se han actualizado las frecuencias, establecer los valores
    setTimeout(() => {
        preventivo.plannedWork.forEach(pw => {
            const frequencySelect = document.getElementById(`frequency-${pw.maintenancePlan}`);
            const occursInput = document.getElementById(`occurs-${pw.maintenancePlan}`);
            
            if (frequencySelect && occursInput) {
                frequencySelect.value = pw.frequency;
                occursInput.value = pw.occursEvery;
            }
        });
        
        // Usar la función de desplazamiento personalizada
        scrollSmoothly(document.getElementById('id-inicial'));
        setTimeout(() => document.getElementById('equipamiento-preventivo').focus(), 850); // Dar tiempo para el desplazamiento
    }, 100);
    
    // Cambiar el texto del botón
    const btnAgregar = document.querySelector('#preventivos button.action-button');
    btnAgregar.textContent = 'Actualizar Preventivo';
    btnAgregar.onclick = actualizarPreventivo;
    
    // Añadir botón para cancelar edición
    if (!document.getElementById('cancelar-edicion-preventivo')) {
        const btnCancelar = document.createElement('button');
        btnCancelar.id = 'cancelar-edicion-preventivo';
        btnCancelar.className = 'action-button cancel-button';
        btnCancelar.textContent = 'Cancelar Edición';
        btnCancelar.onclick = cancelarEdicionPreventivo;
        btnAgregar.parentNode.insertBefore(btnCancelar, btnAgregar.nextSibling);
    }
}

function actualizarPreventivo() {
    if (!modoEdicionPreventivo) return;
    
    const equipamientoKey = document.getElementById('equipamiento-preventivo').value;
    const planesSeleccionados = Array.from(document.getElementById('planes-preventivo').selectedOptions)
        .map(option => option.value);
    
    if (!equipamientoKey) {
        alert('Por favor, seleccione un equipamiento.');
        return;
    }
    
    if (planesSeleccionados.length === 0) {
        alert('Por favor, seleccione al menos un plan de mantenimiento.');
        return;
    }
    
    // Verificar que las frecuencias estén configuradas correctamente
    const frecuencias = [];
    for (const planKey of planesSeleccionados) {
        const frequency = document.getElementById(`frequency-${planKey}`).value;
        const occursEvery = parseInt(document.getElementById(`occurs-${planKey}`).value);
        
        if (!frequency || isNaN(occursEvery) || occursEvery < 1) {
            alert(`Por favor, configure correctamente la frecuencia para el plan ${planKey}.`);
            return;
        }
        
        frecuencias.push({
            planKey,
            frequency,
            occursEvery
        });
    }
    
    // Encontrar el equipamiento seleccionado
    const equipamiento = datos.equipamientos.find(e => e.key === equipamientoKey);
    if (!equipamiento) {
        alert('El equipamiento seleccionado no es válido.');
        return;
    }
    
    const preventivo = datos.preventivos.find(p => p.id === modoEdicionPreventivo);
    if (!preventivo) return;
    
    const preventiveMaintenanceId = preventivo.preventiveMaintenanceId;
    const descripcionPreventivo = `Prev. ${equipamiento.descripcion} (${equipamiento.prefijo})`;
    
    const plannedWork = frecuencias.map(f => {
        return {
            preventiveMaintenanceId,
            maintenancePlan: f.planKey,
            frequency: f.frequency,
            occursEvery: f.occursEvery
        };
    });
    
    // Actualizar el preventivo
    const index = datos.preventivos.findIndex(p => p.id === modoEdicionPreventivo);
    if (index !== -1) {
        datos.preventivos[index] = {
            id: modoEdicionPreventivo,
            preventiveMaintenanceId,
            descripcion: truncateText(descripcionPreventivo, 100),
            asset: equipamientoKey,
            plannedWork
        };
        
        actualizarTablaPreventivos();
        cancelarEdicionPreventivo();
    }
    guardarDatos();
}

function cancelarEdicionPreventivo() {
    modoEdicionPreventivo = null;
    
    // Desmarcar planes seleccionados
    const planesSelect = document.getElementById('planes-preventivo');
    Array.from(planesSelect.options).forEach(option => option.selected = false);
    
    // Limpiar contenedor de frecuencias
    document.getElementById('frecuencias-container').innerHTML = '';
    
    // Restaurar el botón a estado original
    const btnAgregar = document.querySelector('#preventivos button.action-button');
    if (btnAgregar) {
        btnAgregar.textContent = 'Agregar Preventivo';
        btnAgregar.onclick = agregarPreventivo;
    }
    
    // Eliminar botón cancelar
    const btnCancelar = document.getElementById('cancelar-edicion-preventivo');
    if (btnCancelar) btnCancelar.remove();
} // Elimina la llave extra que hay aquí



let modoEdicionTarea = null;

function editarTarea(taskKey) {
    const tarea = datos.tareasTemp.find(t => t.taskKey === taskKey);
    if (!tarea) return;
    
    // Establecer modo edición
    modoEdicionTarea = taskKey;
    
    // Rellenar campos con datos actuales
    document.getElementById('task-key').value = tarea.taskKey;
    document.getElementById('task-descripcion').value = tarea.descripcion;
    document.getElementById('task-duracion').value = tarea.duracion;
    
    // Cambiar el texto del botón
    const btnAgregar = document.querySelector('.add-task-btn');
    btnAgregar.textContent = 'Actualizar Tarea';
    btnAgregar.onclick = function() {
        actualizarTarea();
    };
    
    // Añadir botón para cancelar edición
    if (!document.getElementById('cancelar-edicion-tarea')) {
        const btnCancelar = document.createElement('button');
        btnCancelar.id = 'cancelar-edicion-tarea';
        btnCancelar.className = 'action-button cancel-button';
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.onclick = function() {
            cancelarEdicionTarea();
        };
        btnAgregar.parentNode.insertBefore(btnCancelar, btnAgregar.nextSibling);
    }

    // Marcar visualmente la fila que se está editando
    const filasTareas = document.querySelectorAll("#tareas-body tr");
    filasTareas.forEach(fila => {
        fila.classList.remove('editing-row');
        if (fila.querySelector('td').textContent === taskKey) {
            fila.classList.add('editing-row');
        }
    });
    
    // Usar la función de desplazamiento personalizada
    scrollSmoothly(document.getElementById('task-key'));
}

function procesarCargaMasivaEquipamientos() {
    const texto = document.getElementById('carga-masiva-equipamientos').value.trim();
    if (!texto) {
        alert('Por favor, ingrese datos para la carga masiva.');
        return;
        
    }
    
    const lineas = texto.split('\n');
    let equipamientosAgregados = 0;
    let errores = [];
    
    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (!linea) continue;
        
        // Dividir la línea por tabulaciones o por espacios si no hay tabulaciones
        const partes = linea.includes('\t') ? linea.split('\t') : linea.split(/\s+(.+)/);
        
        if (partes.length < 2) {
            errores.push(`Línea ${i+1}: Formato incorrecto. Se esperaba "PrefijoCódigo[tab]Descripción".`);
            continue;
        }
        
        const prefijoYCodigo = partes[0].trim();
        const descripcionCompleta = partes[1].trim();
        
        // Validar que tengamos un guion para separar prefijo y código
        const partesPC = prefijoYCodigo.split('-');
        if (partesPC.length < 2) {
            errores.push(`Línea ${i+1}: Formato incorrecto para prefijo-código. Use formato "Prefijo-Código".`);
            continue;
        }
        
        // Extraer prefijo (todas las partes excepto la última) y código (última parte)
        const codigo = partesPC[partesPC.length - 1];
        const prefijo = partesPC.slice(0, partesPC.length - 1).join('-');
        
        // Validar descripción
        if (!descripcionCompleta) {
            errores.push(`Línea ${i+1}: Falta la descripción.`);
            continue;
        }
        
        // Construir la clave
        const key = prefijoYCodigo;
        
        // Verificar si ya existe un equipamiento con la misma clave
        if (datos.equipamientos.some(e => e.key === key)) {
            errores.push(`Línea ${i+1}: Ya existe un equipamiento con la clave ${key}.`);
            continue;
        }
        
        // Crear y agregar el equipamiento
        const equipamiento = {
            key,
            prefijo,
            codigo,
            descripcion: truncateText(descripcionCompleta, 100),
            lastModified: new Date().toISOString()
            
        };
        
        datos.equipamientos.push(equipamiento);
        equipamientosAgregados++;
    }
    
    if (equipamientosAgregados > 0) {
        actualizarTablaEquipamientos();
        actualizarSelectorEquipamientos('equipamiento-plan');
        actualizarSelectorEquipamientos('equipamiento-preventivo');
        document.getElementById('carga-masiva-equipamientos').value = '';
        
        if (errores.length === 0) {
            alert(`Se agregaron ${equipamientosAgregados} equipamientos correctamente.`);
        } else {
            alert(`Se agregaron ${equipamientosAgregados} equipamientos.\nSe encontraron ${errores.length} errores:\n${errores.join('\n')}`);
        }
    } else {
        alert(`No se pudo agregar ningún equipamiento.\nErrores encontrados:\n${errores.join('\n')}`);
    }
    


    guardarDatos();
}








function procesarCargaMasivaTareas() {
    const texto = document.getElementById('carga-masiva-tareas').value.trim();
    if (!texto) {
        alert('Por favor, ingrese datos para la carga masiva.');
        return;
    }
    
    const lineas = texto.split('\n');
    let tareasAgregadas = 0;
    let errores = [];
    
    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (!linea) continue;
        
        // Intentar extraer taskKey
        const primerEspacio = linea.indexOf('\t');
        if (primerEspacio === -1) {
            // Si no encuentra tab, intentar con espacio
            const espacioPosicion = linea.indexOf(' ');
            if (espacioPosicion === -1) {
                errores.push(`Línea ${i+1}: Formato incorrecto. No se encontró separador.`);
                continue;
            }
            
            const taskKey = linea.substring(0, espacioPosicion).trim();
            
            // Extraer duración (buscando el patrón H:MM:SS al final)
            const match = linea.match(/(\d+:[0-5]\d:[0-5]\d)$/);
            if (!match) {
                errores.push(`Línea ${i+1}: No se encontró una duración válida en formato H:MM:SS.`);
                continue;
            }
            
            const duracion = match[0];
            
            // La descripción está entre el taskKey y la duración
            const descripcionFin = linea.lastIndexOf(duracion);
            const descripcion = linea.substring(espacioPosicion + 1, descripcionFin).trim();
            
            if (!descripcion) {
                errores.push(`Línea ${i+1}: Falta la descripción.`);
                continue;
            }
            
            // Validar duración
            if (!validateDuration(duracion)) {
                errores.push(`Línea ${i+1}: Formato de duración incorrecto. Debe ser H:MM:SS.`);
                continue;
            }
            
            // Verificar si ya existe una tarea con la misma clave
            if (datos.tareasTemp.some(t => t.taskKey === taskKey)) {
                errores.push(`Línea ${i+1}: Ya existe una tarea con la clave ${taskKey}.`);
                continue;
            }
            
            // Crear y agregar la tarea
            const tarea = {
                taskKey,
                descripcion: truncateText(descripcion, 100),
                duracion
            };
            
            datos.tareasTemp.push(tarea);
            tareasAgregadas++;
        } else {
            // Procesamiento con tabs
            const partes = linea.split('\t');
            if (partes.length < 3) {
                errores.push(`Línea ${i+1}: Formato incorrecto. Se esperaban al menos 3 columnas separadas por tabs.`);
                continue;
            }
            
            const taskKey = partes[0].trim();
            const descripcion = partes[1].trim();
            const duracion = partes[2].trim();
            
            // Validaciones
            if (!taskKey) {
                errores.push(`Línea ${i+1}: Falta la clave de tarea.`);
                continue;
            }
            
            if (!descripcion) {
                errores.push(`Línea ${i+1}: Falta la descripción.`);
                continue;
            }
            
            // Validar duración
            if (!validateDuration(duracion)) {
                errores.push(`Línea ${i+1}: Formato de duración incorrecto. Debe ser H:MM:SS.`);
                continue;
            }
            
            // Verificar si ya existe una tarea con la misma clave
            if (datos.tareasTemp.some(t => t.taskKey === taskKey)) {
                errores.push(`Línea ${i+1}: Ya existe una tarea con la clave ${taskKey}.`);
                continue;
            }
            
            // Crear y agregar la tarea
            const tarea = {
                taskKey,
                descripcion: truncateText(descripcion, 100),
                duracion
            };
            
            datos.tareasTemp.push(tarea);
            tareasAgregadas++;
        }
    }
    
    if (tareasAgregadas > 0) {
        actualizarTablaTareas();
        document.getElementById('carga-masiva-tareas').value = '';
        
        if (errores.length === 0) {
            alert(`Se agregaron ${tareasAgregadas} tareas correctamente.`);
        } else {
            alert(`Se agregaron ${tareasAgregadas} tareas.\nSe encontraron ${errores.length} errores:\n${errores.join('\n')}`);
        }
    } else {
        alert(`No se pudo agregar ninguna tarea.\nErrores encontrados:\n${errores.join('\n')}`);
    }
    guardarDatos();
}










function actualizarTarea() {
    if (!modoEdicionTarea) return;
    
    const taskKey = document.getElementById('task-key').value.trim();
    const descripcion = document.getElementById('task-descripcion').value.trim();
    const duracion = document.getElementById('task-duracion').value.trim();
    
    if (!taskKey || !descripcion || !duracion) {
        alert('Por favor, complete todos los campos de la tarea.');
        return;
    }
    
    if (!validateDuration(duracion)) {
        alert(`Formato de duración incorrecto. Debe ser H:MM:SS`);
        return;
    }
    
    // Si la clave cambia, verificar que no exista otra con la misma clave
    if (taskKey !== modoEdicionTarea && datos.tareasTemp.some(t => t.taskKey === taskKey)) {
        alert('Ya existe una tarea con esta clave.');
        return;
    }
    
    // Actualizar la tarea
    const index = datos.tareasTemp.findIndex(t => t.taskKey === modoEdicionTarea);
    if (index !== -1) {
        datos.tareasTemp[index] = {
            taskKey,
            descripcion: truncateText(descripcion, 100),
            duracion
        };
        
        actualizarTablaTareas();
        cancelarEdicionTarea();
    }
    guardarDatos();
}

function cancelarEdicionTarea() {
    modoEdicionTarea = null;
    
    // Limpiar campos de tarea
    document.getElementById('task-key').value = '';
    document.getElementById('task-descripcion').value = '';
    document.getElementById('task-duracion').value = '';
    
    // Restaurar el botón a estado original
    const btnAgregar = document.querySelector('.add-task-btn');
    btnAgregar.textContent = 'Añadir Tarea';
    btnAgregar.onclick = function() {
        agregarTarea();
    };
    
    // Eliminar botón cancelar
    const btnCancelar = document.getElementById('cancelar-edicion-tarea');
    if (btnCancelar) btnCancelar.remove();

    const filasTareas = document.querySelectorAll("#tareas-body tr");
    filasTareas.forEach(fila => {
        fila.classList.remove('editing-row');
    });
}


function borrarDatosAlmacenados() {
    if (confirm('¿Está seguro de que desea borrar todos los datos almacenados? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('pigmeaGmaoData');
        datos.equipamientos = [];
        datos.planes = [];
        datos.preventivos = [];
        datos.tareasTemp = [];
        datos.currentExportType = null;
        
        actualizarTablaEquipamientos();
        actualizarTablaPlanes();
        actualizarTablaPreventivos();
        actualizarTablaTareas();
        
        alert('Todos los datos han sido borrados.');
    }
}

// Añadir a la función existente o crear una nueva
function actualizarContextoActual() {
    const equipamientoKey = document.getElementById('equipamiento-plan').value;
    const equipamientoDisplay = document.getElementById('current-equipment-display');
    const planDisplay = document.getElementById('current-plan-display');
    const modoIndicator = document.getElementById('current-mode-indicator');
    
    if (equipamientoKey) {
        const equipamiento = datos.equipamientos.find(e => e.key === equipamientoKey);
        if (equipamiento) {
            equipamientoDisplay.textContent = `${equipamiento.key} - ${equipamiento.descripcion}`;
            
            // Buscar si el equipamiento ya tiene un plan asociado
            const planesAsociados = datos.planes.filter(p => planAsociadoA(p, equipamientoKey));
            
            if (planesAsociados.length > 0) {
                // Si tiene planes, mostrarlos en verde
                planDisplay.innerHTML = '';
                
                const planActualLabel = document.createElement('span');
                planActualLabel.textContent = "Plan(es) actual(es): ";
                planDisplay.appendChild(planActualLabel);
                
                const planList = document.createElement('span');
                planList.style.color = '#006400'; // Verde oscuro
                planList.style.fontWeight = 'bold';
                
                // Mostrar todos los planes asociados
                planList.textContent = planesAsociados.map(p => p.planKey).join(", ");
                planDisplay.appendChild(planList);
            } else {
                // Si no tiene planes
                planDisplay.textContent = "Sin plan de mantenimiento asociado";
            }
        } else {
            equipamientoDisplay.textContent = "No seleccionado";
        }
    } else {
        equipamientoDisplay.textContent = "No seleccionado";
        planDisplay.textContent = "Sin plan de mantenimiento asociado";
    }
    
    if (modoEdicionPlan) {
        modoIndicator.textContent = "Modo: Edición";
        modoIndicator.className = "mode-indicator editing-mode";
        document.querySelector('.task-table-container').classList.add('editing-tasks-container');
    } else {
        modoIndicator.textContent = "Modo: Creación";
        modoIndicator.className = "mode-indicator creation-mode";
        document.querySelector('.task-table-container').classList.remove('editing-tasks-container');
    }
}





// Función mejorada para cargar masivamente preventivos
function cargarPreventivosAutomaticos() {

    const idInicialInput = document.getElementById('id-inicial');
    if (!idInicialInput.value.trim()) {
        alert('Por favor, ingrese un ID inicial antes de generar preventivos.');
        idInicialInput.focus();
        return;
    }




    // Verificar si hay equipamientos y planes disponibles
    if (datos.equipamientos.length === 0 || datos.planes.length === 0) {
        alert('No hay equipamientos o planes disponibles para crear preventivos.');
        return;
    }

    // Crear un mapa de equipamientos -> planes disponibles
    const planesDisponiblesPorEquipo = {};
    datos.equipamientos.forEach(equip => {
        planesDisponiblesPorEquipo[equip.key] = [];
    });

    // Llenar el mapa con los planes disponibles para cada equipamiento
    datos.planes.forEach(plan => {
        plan.equipamientos.forEach(eq => {
            if (planesDisponiblesPorEquipo[eq]) {
                planesDisponiblesPorEquipo[eq].push(plan);
            }
        });
    });

    // Filtrar equipamientos que tienen al menos un plan configurado
    const equiposConPlanes = Object.keys(planesDisponiblesPorEquipo)
        .filter(key => planesDisponiblesPorEquipo[key].length > 0);
    
    if (equiposConPlanes.length === 0) {
        alert('No hay equipamientos con planes configurados.');
        return;
    }

    // Identificar equipos que ya tienen preventivos
    const equiposConPreventivosExistentes = equiposConPlanes.filter(equipKey => 
        datos.preventivos.some(prev => prev.asset === equipKey)
    );

    // Si hay preventivos existentes, preguntar qué hacer
    if (equiposConPreventivosExistentes.length > 0) {
        const opcion = confirm(
            `Se encontraron ${equiposConPreventivosExistentes.length} equipamiento(s) que ya tienen preventivos.\n\n` +
            `• Presiona "Aceptar" para actualizar los preventivos existentes y crear nuevos para los demás equipos.\n` +
            `• Presiona "Cancelar" para ignorar los equipos que ya tienen preventivos y solo crear para los nuevos.`
        );
        
        // Si el usuario elige actualizar, mostrar opciones adicionales
        if (opcion) {
            const opcionActualizar = confirm(
                `¿Cómo desea actualizar los preventivos existentes?\n\n` +
                `• Presiona "Aceptar" para mantener los planes actuales y agregar solo los nuevos planes.\n` +
                `• Presiona "Cancelar" para reemplazar completamente los preventivos existentes.`
            );
            return procesarCargaPreventivos(equiposConPlanes, planesDisponiblesPorEquipo, opcion, opcionActualizar);
        }
    }
    
    // Si no hay preventivos existentes o el usuario eligió ignorarlos
    procesarCargaPreventivos(equiposConPlanes, planesDisponiblesPorEquipo, false, false);
}

// Función auxiliar para procesar la carga de preventivos según las opciones elegidas
function procesarCargaPreventivos(equiposConPlanes, planesDisponiblesPorEquipo, actualizarExistentes, mantenerPlanes) {
    // Obtener el ID inicial para los nuevos preventivos
    let idInicial = parseInt(document.getElementById('id-inicial').value);
    if (datos.preventivos.length > 0) {
        const maxId = Math.max(...datos.preventivos.map(p => p.id));
        idInicial = Math.max(idInicial, maxId + 1);
    }

    // Estadísticas para mostrar al final
    let preventivosCreados = 0;
    let preventivosActualizados = 0;
    let equiposIgnorados = [];

    // Procesar cada equipo
    equiposConPlanes.forEach(equipKey => {
        const equipamiento = datos.equipamientos.find(e => e.key === equipKey);
        const planesDelEquipo = planesDisponiblesPorEquipo[equipKey];
        const preventivoExistente = datos.preventivos.find(prev => prev.asset === equipKey);
        
        // Si ya existe un preventivo para este equipo
        if (preventivoExistente) {
            // Si elegimos no actualizar, ignorar este equipo
            if (!actualizarExistentes) {
                equiposIgnorados.push(equipKey);
                return;
            }
            
            // Actualizar el preventivo existente
            if (mantenerPlanes) {
                // Mantener planes actuales y agregar solo los nuevos
                const planesExistentes = new Set();
                preventivoExistente.plannedWork.forEach(pw => {
                    planesExistentes.add(pw.maintenancePlan);
                });
                
                // Agregar solo planes que no estén ya en el preventivo
                planesDelEquipo.forEach(plan => {
                    if (!planesExistentes.has(plan.planKey)) {
                        const nuevoPlannedWork = crearPlannedWork(preventivoExistente.preventiveMaintenanceId, plan);
                        preventivoExistente.plannedWork.push(nuevoPlannedWork);
                    }
                });
            } else {
                // Reemplazar completamente los planned work
                preventivoExistente.plannedWork = planesDelEquipo.map(plan => 
                    crearPlannedWork(preventivoExistente.preventiveMaintenanceId, plan)
                );
            }
            
            // Actualizar descripción por si cambió la del equipamiento
            preventivoExistente.descripcion = `Prev. ${equipamiento.descripcion} (${equipamiento.prefijo})`;
            preventivosActualizados++;
            
        } else {
            // Crear un nuevo preventivo
            const preventiveMaintenanceId = `PR${idInicial.toString().padStart(7, '0')}`;
            const descripcionPreventivo = `Prev. ${equipamiento.descripcion} (${equipamiento.prefijo})`;
            
            const plannedWork = planesDelEquipo.map(plan => 
                crearPlannedWork(preventiveMaintenanceId, plan)
            );
            
            const preventivo = {
                id: idInicial,
                preventiveMaintenanceId,
                descripcion: truncateText(descripcionPreventivo, 100),
                asset: equipKey,
                plannedWork
            };
            
            datos.preventivos.push(preventivo);
            preventivosCreados++;
            idInicial++;
        }
    });

    // Actualizar la interfaz
    actualizarTablaPreventivos();
    document.getElementById('id-inicial').value = idInicial;
    guardarDatos();

    // Actualizar selectores con los nuevos indicadores
actualizarSelectorEquipamientos('equipamiento-plan');
actualizarSelectorEquipamientos('equipamiento-preventivo');
actualizarTablaEquipamientos();
    
    // Mostrar resultado con estadísticas detalladas
    let mensaje = `Resumen de la operación:\n\n`;
    mensaje += `• Preventivos nuevos creados: ${preventivosCreados}\n`;
    mensaje += `• Preventivos existentes actualizados: ${preventivosActualizados}\n`;
    if (equiposIgnorados.length > 0) {
        mensaje += `• Equipamientos ignorados: ${equiposIgnorados.length}\n`;
    }
    
    // Detalles adicionales según la operación
    if (actualizarExistentes && mantenerPlanes) {
        mensaje += `\nLos preventivos existentes se actualizaron añadiendo solo los nuevos planes.`;
    } else if (actualizarExistentes) {
        mensaje += `\nLos preventivos existentes se reemplazaron completamente con nuevos planes.`;
    }
    
    alert(mensaje);
}

// Función auxiliar para crear un planned work basado en un plan
function crearPlannedWork(preventiveMaintenanceId, plan) {
    const { frequency, occursEvery } = getFrequencyConfig(plan.periodicidad);

    return {
        preventiveMaintenanceId,
        maintenancePlan: plan.planKey,
        frequency,
        occursEvery
    };
}


function previsualizarDatos(tipo) {
    const previewText = document.getElementById('preview-text');
    datos.currentExportType = tipo;
    let csv = '';
    let hasData = false;

    switch (tipo) {
        case 'equipamientos':
            if (datos.equipamientos.length > 0) {
                hasData = true;
                csv = 'Key,Descripcion,UltimaModificacion\n';
                datos.equipamientos.forEach(e => {
                    const fechaMod = e.lastModified ? e.lastModified : '';
                    csv += `${escapeCSV(e.key)},${escapeCSV(e.descripcion)},${escapeCSV(fechaMod)}\n`;
                });
            }
            break;
            
        case 'planes':
            if (datos.planes.length > 0) {
                hasData = true;
                csv = 'MaintenancePlanKey,Descripcion\n';
                datos.planes.forEach(p => {
                    csv += `${escapeCSV(p.planKey)},${escapeCSV(p.descripcion)}\n`;
                });
            }
            break;
            
        case 'tareas':
            hasData = datos.planes.some(p => p.tareas && p.tareas.length > 0);
            if (hasData) {
                csv = 'MaintenancePlanKey,PlanDescripcion,TaskKey,Descripcion,Duracion\n';
                datos.planes.forEach(p => {
                    if (p.tareas) {
                        p.tareas.forEach(t => {
                            csv += `${escapeCSV(p.planKey)},${escapeCSV(p.descripcion)},${escapeCSV(t.taskKey)},${escapeCSV(t.descripcion)},${escapeCSV(t.duracion)}\n`;
                        });
                    }
                });
            }
            break;
            
        case 'preventivos':
            if (datos.preventivos.length > 0) {
                hasData = true;
                csv = 'PreventiveMaintenanceId,Descripcion,Asset\n';
                datos.preventivos.forEach(p => {
                    csv += `${escapeCSV(p.preventiveMaintenanceId)},${escapeCSV(p.descripcion)},${escapeCSV(p.asset)}\n`;
                });
            }
            break;
            
        case 'planned-work':
            hasData = datos.preventivos.some(p => p.plannedWork && p.plannedWork.length > 0);
            if (hasData) {
                csv = 'PreventiveMaintenanceId,MaintenancePlan,Frequency,OccursEvery\n';
                datos.preventivos.forEach(p => {
                    if (p.plannedWork) {
                        p.plannedWork.forEach(pw => {
                            // Modificado: Extraer solo el número del ID eliminando el prefijo 'PR'
                            const idNumerico = pw.preventiveMaintenanceId.replace(/^PR0*/, '');
                            csv += `${escapeCSV(idNumerico)},${escapeCSV(pw.maintenancePlan)},${escapeCSV(pw.frequency)},${escapeCSV(pw.occursEvery)}\n`;
                        });
                    }
                });
            }
            break;
    }

    if (!hasData) {
        previewText.textContent = 'No hay datos disponibles para mostrar.';
    } else {
        previewText.textContent = csv;
    }

    // Mostrar/ocultar botones según si hay datos
    document.getElementById('copy-button').style.display = hasData ? 'inline-block' : 'none';
    document.getElementById('download-button').style.display = hasData ? 'inline-block' : 'none';
    
    const toggleButton = document.getElementById('toggle-view-button');
    if (toggleButton) {
        toggleButton.style.display = hasData ? 'inline-block' : 'none';
    }
}




function previsualizarDatosExcel(tipo) {
    const previewContainer = document.getElementById('preview-text');
    previewContainer.innerHTML = ''; // Limpiar contenido previo
    datos.currentExportType = tipo;
    
    // Crear tabla para previsualizar datos
    const table = document.createElement('table');
    table.className = 'excel-preview-table';
    
    let headerRow = document.createElement('tr');
    let hasData = false;

    switch (tipo) {
        case 'equipamientos':
            if (datos.equipamientos.length === 0) break;
            hasData = true;
            headerRow.innerHTML = '<th>Key</th><th>Descripcion</th><th>Última Modificación</th>';
            table.appendChild(headerRow);
            
            datos.equipamientos.forEach(e => {
                let row = document.createElement('tr');
                const fechaMod = e.lastModified ? formatearFecha(new Date(e.lastModified)) : 'No disponible';
                row.innerHTML = `<td>${e.key}</td><td>${e.descripcion}</td><td>${fechaMod}</td>`;
                table.appendChild(row);
            });
            break;
            
        case 'planes':
            if (datos.planes.length === 0) break;
            hasData = true;
            headerRow.innerHTML = '<th>MaintenancePlanKey</th><th>Descripcion</th>';
            table.appendChild(headerRow);
            
            datos.planes.forEach(p => {
                let row = document.createElement('tr');
                row.innerHTML = `<td>${p.planKey}</td><td>${p.descripcion}</td>`;
                table.appendChild(row);
            });
            break;
            
        case 'tareas':
            hasData = false;
            datos.planes.forEach(p => {
                if (p.tareas && p.tareas.length > 0) hasData = true;
            });
            if (!hasData) break;

            headerRow.innerHTML = '<th>MaintenancePlanKey</th><th>PlanDescripcion</th><th>TaskKey</th><th>Descripcion</th><th>Duracion</th>';
            table.appendChild(headerRow);

            datos.planes.forEach(p => {
                if (p.tareas) {
                    p.tareas.forEach(t => {
                        let row = document.createElement('tr');
                        row.innerHTML = `<td>${p.planKey}</td><td>${p.descripcion}</td><td>${t.taskKey}</td><td>${t.descripcion}</td><td>${t.duracion}</td>`;
                        table.appendChild(row);
                    });
                }
            });
            break;
            
        case 'preventivos':
            if (datos.preventivos.length === 0) break;
            hasData = true;
            headerRow.innerHTML = '<th>PreventiveMaintenanceId</th><th>Descripcion</th><th>Asset</th>';
            table.appendChild(headerRow);
            
            datos.preventivos.forEach(p => {
                let row = document.createElement('tr');
                row.innerHTML = `<td>${p.preventiveMaintenanceId}</td><td>${p.descripcion}</td><td>${p.asset}</td>`;
                table.appendChild(row);
            });
            break;
            
        case 'planned-work':
            hasData = false;
            datos.preventivos.forEach(p => {
                if (p.plannedWork && p.plannedWork.length > 0) hasData = true;
            });
            if (!hasData) break;

            headerRow.innerHTML = '<th>PreventiveMaintenanceId</th><th>MaintenancePlan</th><th>Frequency</th><th>OccursEvery</th>';
            table.appendChild(headerRow);
            
            datos.preventivos.forEach(p => {
                if (p.plannedWork) {
                    p.plannedWork.forEach(pw => {
                        let row = document.createElement('tr');
                        // Modificado: Extraer solo el número del ID eliminando el prefijo 'PR'
                        const idNumerico = pw.preventiveMaintenanceId.replace(/^PR0*/, '');
                        row.innerHTML = `<td>${idNumerico}</td><td>${pw.maintenancePlan}</td><td>${pw.frequency}</td><td>${pw.occursEvery}</td>`;
                        table.appendChild(row);
                    });
                }
            });
            break;
    }

    if (!hasData) {
        const noDataMsg = document.createElement('p');
        noDataMsg.textContent = 'No hay datos disponibles para mostrar.';
        previewContainer.appendChild(noDataMsg);
    } else {
        previewContainer.appendChild(table);
    }

    // Mostrar botones solo si hay datos
    document.getElementById('copy-button').style.display = hasData ? 'inline-block' : 'none';
    document.getElementById('download-button').style.display = hasData ? 'inline-block' : 'none';

    // Actualizar o crear el botón de alternar vista
    let toggleButton = document.getElementById('toggle-view-button');
    if (!toggleButton) {
        toggleButton = document.createElement('button');
        toggleButton.id = 'toggle-view-button';
        toggleButton.className = 'action-button';
        document.getElementById('copy-button').parentNode.insertBefore(
            toggleButton,
            document.getElementById('copy-button').nextSibling
        );
    }
    toggleButton.textContent = 'Cambiar a Vista Texto';
    toggleButton.style.display = hasData ? 'inline-block' : 'none';
    toggleButton.onclick = () => togglePreviewView(tipo);
}



function togglePreviewView(tipo) {
    const previewContainer = document.getElementById('preview-text');
    const toggleButton = document.getElementById('toggle-view-button');
    
    if (previewContainer.querySelector('table')) {
        // Cambiar a vista de texto
        previsualizarDatos(tipo);
        toggleButton.textContent = 'Cambiar a Vista Tabla';
    } else {
        // Cambiar a vista de tabla
        previsualizarDatosExcel(tipo);
        toggleButton.textContent = 'Cambiar a Vista Texto';
    }
}

// Agrega este event listener al final del script
document.getElementById('equipamiento-plan').addEventListener('change', function() {
    actualizarContextoActual();
    destacarPlanesRelacionados();
});

// Función mejorada para destacar planes relacionados
function destacarPlanesRelacionados() {
    const equipamientoKey = document.getElementById('equipamiento-plan').value;
    
    // Quitar la clase de todas las filas de planes
    const filas = document.querySelectorAll('#planes-body tr');
    filas.forEach(fila => {
        fila.classList.remove('fila-relacionada');
        fila.style.display = ''; // Mostrar todas las filas primero
    });
    
    if (equipamientoKey) {
        // Resaltar y mostrar solo las filas de los planes relacionados con este equipamiento
        filas.forEach(fila => {
            const filaEquip = fila.dataset.equipKey;
            if (filaEquip === equipamientoKey) {
                fila.classList.add('fila-relacionada');
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    }
}

// Función mejorada para destacar preventivos relacionados
function destacarPreventivosRelacionados() {
    const equipamientoKey = document.getElementById('equipamiento-preventivo').value;
    
    // Quitar la clase de todas las filas de preventivos
    const filas = document.querySelectorAll('#preventivos-body tr');
    filas.forEach(fila => {
        fila.classList.remove('fila-relacionada');
        fila.style.display = ''; // Mostrar todas las filas primero
    });
    
    if (equipamientoKey) {
        // Resaltar y mostrar solo las filas de los preventivos relacionados con este equipamiento
        filas.forEach(fila => {
            // La tercera celda (índice 2) contiene el asset (equipamientoKey)
            const asset = fila.cells[2].textContent;
            
            if (asset === equipamientoKey) {
                fila.classList.add('fila-relacionada');
                fila.style.display = ''; // Asegurarse que sea visible
            } else {
                fila.style.display = 'none'; // Ocultar filas no relacionadas
            }
        });
    }
}

// Función para hacer tablas ordenables
function hacerTablaOrdenable(tablaId, columnasPredefinidas = []) {
    const tabla = document.getElementById(tablaId);
    if (!tabla) return;
    
    const thead = tabla.querySelector('thead');
    if (!thead) return;
    
    const headers = thead.querySelectorAll('th');
    
    // Marcar columnas como ordenables y agregar event listeners
    headers.forEach((th, index) => {
        // Verificar si esta columna debe ser ordenable
        const columnaOrdenable = columnasPredefinidas.length === 0 || columnasPredefinidas.includes(index);
        
        if (columnaOrdenable && th.textContent.trim() !== 'Acciones') {
            th.classList.add('sortable');
            th.addEventListener('click', () => ordenarTabla(tabla, index, th));
        }
    });
}

// Función para ordenar tabla
function ordenarTabla(tabla, columnaIndex, headerElement) {
    const tbody = tabla.querySelector('tbody');
    const filas = Array.from(tbody.querySelectorAll('tr'));
    
    // Determinar la dirección de ordenamiento
    const isAsc = !headerElement.classList.contains('asc');
    
    // Actualizar clases en todos los encabezados
    tabla.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
    });
    
    // Establecer clase en el encabezado actual
    headerElement.classList.add(isAsc ? 'asc' : 'desc');
    
    // Función para comparar valores (detecta automáticamente si son números o texto)
    const compararValores = (a, b) => {
        const valorA = a.cells[columnaIndex].textContent.trim();
        const valorB = b.cells[columnaIndex].textContent.trim();
        
        // Detectar si los valores son numéricos (incluso si tienen prefijos)
        const numA = extraerNumero(valorA);
        const numB = extraerNumero(valorB);
        
        // Si ambos son números, comparar numéricamente
        if (!isNaN(numA) && !isNaN(numB)) {
            return isAsc ? numA - numB : numB - numA;
        }
        
        // Comparación alfabética para texto
        return isAsc 
            ? valorA.localeCompare(valorB, 'es', { sensitivity: 'base' }) 
            : valorB.localeCompare(valorA, 'es', { sensitivity: 'base' });
    };
    
    // Ordenar filas
    const filasOrdenadas = filas.sort(compararValores);
    
    // Redibujar tabla con filas ordenadas
    tbody.innerHTML = '';
    filasOrdenadas.forEach(fila => tbody.appendChild(fila));
    
    // Si hay filas destacadas, restaurarlas
    if (tabla.id === 'tabla-planes') {
        destacarPlanesRelacionados();
    } else if (tabla.id === 'tabla-preventivos') {
        destacarPreventivosRelacionados();
    }
}

// Event listener para el buscador de equipamientos
document.addEventListener('DOMContentLoaded', function() {
    const buscarInput = document.getElementById('buscar-equipamiento');
    if (buscarInput) {
        buscarInput.addEventListener('input', buscarEquipamientos);
    }
    actualizarSelectorPlanExistente();
});

// Función auxiliar para extraer números de textos como "PR0000123" o "Plan-45"
function extraerNumero(texto) {
    // Buscar secuencias de dígitos en el texto
    const matches = texto.match(/\d+/g);
    if (matches && matches.length > 0) {
        // Si hay varios grupos de números, usar el más largo
        const numStr = matches.reduce((a, b) => a.length >= b.length ? a : b);
        return parseInt(numStr, 10);
    }
    return NaN; // No es un número
}

