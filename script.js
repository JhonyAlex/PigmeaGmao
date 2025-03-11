// Variables globales para almacenar los datos
const datos = {
    equipamientos: [],
    planes: [],
    preventivos: [],
    currentExportType: null
};

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
        return '"' + t.replace(/"/g, '""') + '"';
    }
    return '"' + t + '"';
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

// Funciones para Planes de Mantenimiento
function agregarPlanMantenimiento() {
    const equipamientoKey = document.getElementById('equipamiento-plan').value;
    const planKey = document.getElementById('plan-key').value.trim();
    const periodicidad = document.getElementById('periodicidad').value;
    const tareasTexto = document.getElementById('tareas-texto').value.trim();
    
    if (!equipamientoKey || !planKey || !periodicidad) {
        alert('Por favor, complete los campos requeridos del plan de mantenimiento.');
        return;
    }
    
    if (!tareasTexto) {
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
    
    // Procesar las tareas
    const tareasArray = parseTabSeparatedValues(tareasTexto);
    const tareas = [];
    
    for (const tareaData of tareasArray) {
        if (tareaData.length < 3) {
            alert('Formato de tarea incorrecto. Debe incluir TaskKey, Descripción y Duración.');
            return;
        }
        
        const [taskKey, descripcion, duracion] = tareaData;
        
        if (!taskKey || !descripcion || !duracion) {
            alert('Todos los campos de la tarea son obligatorios.');
            return;
        }
        
        if (!validateDuration(duracion)) {
            alert(`Formato de duración incorrecto para la tarea ${taskKey}. Debe ser H:MM:SS`);
            return;
        }
        
        tareas.push({
            taskKey: taskKey.trim(),
            descripcion: truncateText(descripcion.trim(), 100),
            duracion: duracion.trim()
        });
    }
    
    const descripcionPlan = `${equipamiento.descripcion} - ${periodicidad}`;
    
    const plan = {
        planKey,
        equipamientoKey,
        equipamientoPrefijo: equipamiento.prefijo,
        descripcion: truncateText(descripcionPlan, 100),
        periodicidad,
        tareas
    };
    
    datos.planes.push(plan);
    actualizarTablaPlanes();
    
    // Limpiar formulario
    document.getElementById('plan-key').value = '';
    document.getElementById('periodicidad').value = '';
    document.getElementById('tareas-texto').value = '';
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
}

function eliminarPreventivo(id) {
    datos.preventivos = datos.preventivos.filter(p => p.id !== id);
    actualizarTablaPreventivos();
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

// Funciones para exportar datos
function previsualizarDatos(tipo) {
    const previewText = document.getElementById('preview-text');
    datos.currentExportType = tipo;
    let csv = '';
    
    switch (tipo) {
        case 'equipamientos':
            csv = 'Key,Descripcion\n';
            datos.equipamientos.forEach(e => {
                csv += `"${escapeCSV(e.key)}","${escapeCSV(e.descripcion)}"\n`;
            });
            break;
            
        case 'planes':
            csv = 'MaintenancePlanKey,Descripcion\n';
            datos.planes.forEach(p => {
                csv += `"${escapeCSV(p.planKey)}","${escapeCSV(p.descripcion)}"\n`;
            });
            break;
            
        case 'tareas':
            csv = 'MaintenancePlanKey,TaskKey,Descripcion,Duracion\n';
            datos.planes.forEach(p => {
                p.tareas.forEach(t => {
                    csv += `"${escapeCSV(p.planKey)}","${escapeCSV(t.taskKey)}","${escapeCSV(t.descripcion)}","${escapeCSV(t.duracion)}"\n`;
                });
            });
            break;
            
        case 'preventivos':
            csv = 'PreventiveMaintenanceId,Descripcion,Asset\n';
            datos.preventivos.forEach(p => {
                csv += `"${escapeCSV(p.preventiveMaintenanceId)}","${escapeCSV(p.descripcion)}","${escapeCSV(p.asset)}"\n`;
            });
            break;
            
        case 'planned-work':
            csv = 'PreventiveMaintenanceId,MaintenancePlan,Frequency,OccursEvery\n';
            datos.preventivos.forEach(p => {
                p.plannedWork.forEach(pw => {
                    csv += `"${escapeCSV(pw.preventiveMaintenanceId)}","${escapeCSV(pw.maintenancePlan)}","${escapeCSV(pw.frequency)}","${escapeCSV(pw.occursEvery)}"\n`;
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

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar la primera pestaña como activa
    document.querySelector('.tab-button').classList.add('active');
    document.querySelector('.tab-content').classList.add('active');
});
