// Variables globales para almacenar los datos
const datos = {
    equipamientos: [],
    planes: [],
    preventivos: [],
    tareasTemp: [],
    currentExportType: null
    
};



// Funciones para localStorage - AÑADIR DESPUÉS DE LA DEFINICIÓN DE DATOS
function guardarDatos() {
    localStorage.setItem('pigmeaGmaoData', JSON.stringify(datos));
}

function cargarDatos() {
    const datosGuardados = localStorage.getItem('pigmeaGmaoData');
    if (datosGuardados) {
        const datosParseados = JSON.parse(datosGuardados);
        // Actualizar el objeto datos con los valores guardados
        datos.equipamientos = datosParseados.equipamientos || [];
        datos.planes = datosParseados.planes || [];
        datos.preventivos = datosParseados.preventivos || [];
        datos.currentExportType = datosParseados.currentExportType;
        
        // Actualizar tablas
        actualizarTablaEquipamientos();
        actualizarTablaPlanes();
        actualizarTablaPreventivos();
    }
}

// Iniciar carga de datos cuando la página esté lista
document.addEventListener('DOMContentLoaded', cargarDatos);







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
    } else if (tabName === 'preventivos') {
        actualizarSelectorEquipamientos('equipamiento-preventivo');
        actualizarSelectorPlanes();
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
    const enUsoPlan = datos.planes.some(plan => plan.equipamientoKey === modoEdicionEquipamiento);
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
            descripcion: truncateText(descripcion, 100)
        };
        
        // Si la clave cambió, actualizar referencias en planes y preventivos
        if (newKey !== modoEdicionEquipamiento) {
            datos.planes.forEach(plan => {
                if (plan.equipamientoKey === modoEdicionEquipamiento) {
                    plan.equipamientoKey = newKey;
                    plan.equipamientoPrefijo = prefijo;
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
    const enUsoPlan = datos.planes.some(plan => plan.equipamientoKey === key);
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
        tr.appendChild(tdActions);
        
        tbody.appendChild(tr);
    });
}

function actualizarSelectorEquipamientos(selectorId) {
    const selector = document.getElementById(selectorId);
    selector.innerHTML = '<option value="">-- Seleccionar equipamiento --</option>';
    
    datos.equipamientos.forEach(equipamiento => {
        const option = document.createElement('option');
        option.value = equipamiento.key;
        option.textContent = `${equipamiento.key} - ${equipamiento.descripcion}`;
        selector.appendChild(option);
    });
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
    if (datos.planes.some(p => p.planKey === planKey)) {
        alert('Ya existe un plan con esta clave.');
        return;
    }
    
    // Encontrar el equipamiento seleccionado
    const equipamiento = datos.equipamientos.find(e => e.key === equipamientoKey);
    if (!equipamiento) {
        alert('El equipamiento seleccionado no es válido.');
        return;
    }
    
    const descripcionPlan = `${equipamiento.descripcion} - ${periodicidad}`;
    
    const plan = {
        planKey,
        equipamientoKey,
        equipamientoPrefijo: equipamiento.prefijo,
        descripcion: truncateText(descripcionPlan, 100),
        periodicidad,
        tareas: [...datos.tareasTemp] // Copia las tareas temporales
    };
    
    datos.planes.push(plan);
    actualizarTablaPlanes();
    
    // Limpiar formulario
    document.getElementById('plan-key').value = '';
    document.getElementById('periodicidad').value = '';
    datos.tareasTemp = []; // Limpiar tareas temporales
    actualizarTablaTareas(); // Actualizar tabla de tareas
    guardarDatos();
}

function eliminarPlan(planKey) {
    // Verificar si el plan está en uso en preventivos
    const enUso = datos.preventivos.some(prev => {
        return prev.plannedWork.some(pw => pw.maintenancePlan === planKey);
    });
    
    if (enUso) {
        alert('No se puede eliminar este plan porque está siendo utilizado en preventivos.');
        return;
    }
    
    datos.planes = datos.planes.filter(p => p.planKey !== planKey);
    actualizarTablaPlanes();
    actualizarSelectorPlanes();
    guardarDatos();
}

function actualizarTablaPlanes() {
    const tbody = document.getElementById('planes-body');
    tbody.innerHTML = '';
    
    datos.planes.forEach(plan => {
        const tr = document.createElement('tr');
        
        const tdKey = document.createElement('td');
        tdKey.textContent = plan.planKey;
        
        const tdDesc = document.createElement('td');
        tdDesc.textContent = plan.descripcion;
        
        const tdTareas = document.createElement('td');
        tdTareas.textContent = `${plan.tareas.length} tarea(s)`;
        
        const tdActions = document.createElement('td');
        
        // Botón de edición
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-button';
        editBtn.textContent = 'Editar';
        editBtn.onclick = () => editarPlan(plan.planKey);
        tdActions.appendChild(editBtn);
        
        // Botón de eliminación
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = () => eliminarPlan(plan.planKey);
        tdActions.appendChild(deleteBtn);
        
        tr.appendChild(tdKey);
        tr.appendChild(tdDesc);
        tr.appendChild(tdTareas);
        tr.appendChild(tdActions);
        
        tbody.appendChild(tr);
    });
}

function actualizarSelectorPlanes() {
    const selector = document.getElementById('planes-preventivo');
    selector.innerHTML = '';
    
    // Obtener el equipamiento seleccionado
    const equipamientoKey = document.getElementById('equipamiento-preventivo').value;
    if (!equipamientoKey) return;
    
    // Filtrar planes por el equipamiento seleccionado
    const planesFiltrados = datos.planes.filter(p => p.equipamientoKey === equipamientoKey);
    
    planesFiltrados.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.planKey;
        option.textContent = `${plan.planKey} - ${plan.descripcion}`;
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
            
            // Seleccionar valor basado en la periodicidad del plan
            if (plan.periodicidad === 'Diario') {
                optionDaily.selected = true;
            } else if (plan.periodicidad === 'Semanal' || plan.periodicidad === 'Quincenal') {
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
            
            // Establecer valor predeterminado basado en la periodicidad
            if (plan.periodicidad === 'Diario') {
                inputOccurs.value = '1';
            } else if (plan.periodicidad === 'Semanal') {
                inputOccurs.value = '1';
            } else if (plan.periodicidad === 'Quincenal') {
                inputOccurs.value = '2';
            } else if (plan.periodicidad === 'Mensual') {
                inputOccurs.value = '1';
            } else if (plan.periodicidad === 'Trimestral') {
                inputOccurs.value = '3';
            } else if (plan.periodicidad === 'Semestral') {
                inputOccurs.value = '6';
            } else if (plan.periodicidad === 'Anual') {
                inputOccurs.value = '12';
            }
            
            div.appendChild(inputOccurs);
            
            container.appendChild(div);
        });
    }
}

document.getElementById('equipamiento-preventivo').addEventListener('change', function() {
    actualizarSelectorPlanes();
    actualizarFrecuencias();
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
    
    datos.preventivos.push(preventivo);
    actualizarTablaPreventivos();
    
    // Actualizar el valor de ID inicial para el próximo preventivo
    document.getElementById('id-inicial').value = idPreventivo + 1;
    guardarDatos();
}

function eliminarPreventivo(id) {
    datos.preventivos = datos.preventivos.filter(p => p.id !== id);
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
}

function previsualizarDatos(tipo) {
    const previewText = document.getElementById('preview-text');
    datos.currentExportType = tipo;
    let csv = '';
    
    switch (tipo) {
        case 'equipamientos':
            csv = 'Key,Descripcion\n';
            datos.equipamientos.forEach(e => {
                csv += `${escapeCSV(e.key)},${escapeCSV(e.descripcion)}\n`;
            });
            break;
            
        case 'planes':
            csv = 'MaintenancePlanKey,Descripcion\n';
            datos.planes.forEach(p => {
                csv += `${escapeCSV(p.planKey)},${escapeCSV(p.descripcion)}\n`;
            });
            break;
            
        case 'tareas':
            csv = 'MaintenancePlanKey,TaskKey,Descripcion,Duracion\n';
            datos.planes.forEach(p => {
                p.tareas.forEach(t => {
                    csv += `${escapeCSV(p.planKey)},${escapeCSV(t.taskKey)},${escapeCSV(t.descripcion)},${escapeCSV(t.duracion)}\n`;
                });
            });
            break;
            
        case 'preventivos':
            csv = 'PreventiveMaintenanceId,Descripcion,Asset\n';
            datos.preventivos.forEach(p => {
                csv += `${escapeCSV(p.preventiveMaintenanceId)},${escapeCSV(p.descripcion)},${escapeCSV(p.asset)}\n`;
            });
            break;
            
        case 'planned-work':
            csv = 'PreventiveMaintenanceId,MaintenancePlan,Frequency,OccursEvery\n';
            datos.preventivos.forEach(p => {
                p.plannedWork.forEach(pw => {
                    csv += `${escapeCSV(pw.preventiveMaintenanceId)},${escapeCSV(pw.maintenancePlan)},${escapeCSV(pw.frequency)},${escapeCSV(pw.occursEvery)}\n`;
                });
            });
            break;
    }
    
    previewText.textContent = csv;
    document.getElementById('copy-button').style.display = 'inline-block';
    document.getElementById('download-button').style.display = 'inline-block';
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





let modoEdicionPlan = null;

function editarPlan(planKey) {
    const plan = datos.planes.find(p => p.planKey === planKey);
    if (!plan) return;
    
    // Establecer modo edición
    modoEdicionPlan = planKey;
    
    // Rellenar campos con datos actuales
    document.getElementById('equipamiento-plan').value = plan.equipamientoKey;
    document.getElementById('plan-key').value = plan.planKey;
    document.getElementById('periodicidad').value = plan.periodicidad;
    
    // Cargar las tareas del plan en tareasTemp
    datos.tareasTemp = JSON.parse(JSON.stringify(plan.tareas)); // Copia profunda de las tareas
    actualizarTablaTareas();
    
    // Cambiar el texto del botón de agregar plan (el que está fuera de la carga masiva)
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
}

function actualizarPlan() {
    if (!modoEdicionPlan) return;
    
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
    
    // Si la clave cambia, verificar que no exista otra igual
    if (planKey !== modoEdicionPlan && datos.planes.some(p => p.planKey === planKey)) {
        alert('Ya existe un plan con esta clave.');
        return;
    }
    
    // Verificar si el plan está en uso en preventivos
    const enUso = datos.preventivos.some(prev => {
        return prev.plannedWork.some(pw => pw.maintenancePlan === modoEdicionPlan);
    });
    
    // Si está en uso y la clave va a cambiar, avisar y cancelar
    if (enUso && planKey !== modoEdicionPlan) {
        alert('No puede cambiar la clave del plan porque está siendo utilizado en preventivos.');
        return;
    }
    
    // Encontrar el equipamiento seleccionado
    const equipamiento = datos.equipamientos.find(e => e.key === equipamientoKey);
    if (!equipamiento) {
        alert('El equipamiento seleccionado no es válido.');
        return;
    }
    
    const descripcionPlan = `${equipamiento.descripcion} - ${periodicidad}`;
    
    // Actualizar el plan
    const index = datos.planes.findIndex(p => p.planKey === modoEdicionPlan);
    if (index !== -1) {
        datos.planes[index] = {
            planKey,
            equipamientoKey,
            equipamientoPrefijo: equipamiento.prefijo,
            descripcion: truncateText(descripcionPlan, 100),
            periodicidad,
            tareas: [...datos.tareasTemp]
        };
        
        // Si la clave cambió, actualizar referencias en preventivos
        if (planKey !== modoEdicionPlan) {
            datos.preventivos.forEach(prev => {
                prev.plannedWork.forEach(pw => {
                    if (pw.maintenancePlan === modoEdicionPlan) {
                        pw.maintenancePlan = planKey;
                    }
                });
            });
        }
        
        actualizarTablaPlanes();
        actualizarSelectorPlanes();
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
}



// Corregir la función editarPreventivo
let modoEdicionPreventivo = null;

function editarPreventivo(id) {
    const preventivo = datos.preventivos.find(p => p.id === id);
    if (!preventivo) return;
    
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
            descripcion: truncateText(descripcionCompleta, 100)
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