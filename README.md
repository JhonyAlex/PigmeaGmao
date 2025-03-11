# Generador de Datos GMAO

Este proyecto es una aplicación web que permite generar datos estructurados para sistemas de Gestión de Mantenimiento Asistido por Ordenador (GMAO). La aplicación funciona completamente en el lado del cliente (offline) utilizando HTML, CSS y JavaScript.

## Descripción

Esta herramienta le permite crear y gestionar:

- **Equipamientos/Piezas**: Define elementos con un código único (Key) y descripción.
- **Planes de Mantenimiento**: Asociados a equipamientos, con periodicidad y tareas.
- **Tareas**: Actividades específicas con identificador, descripción y duración.
- **Preventivos**: Agrupaciones que conectan equipamientos con planes de mantenimiento.
- **Planned Work**: Define la frecuencia de ejecución de los planes en los preventivos.

Los datos generados se pueden exportar en formato CSV para ser importados fácilmente a Excel u otros sistemas GMAO.

## Características

- Interfaz de usuario intuitiva con pestañas para organizar el flujo de trabajo
- Validación de datos para evitar errores comunes
- Vista previa de los datos antes de exportarlos
- Exportación a CSV para facilitar la importación a Excel
- Funciona completamente offline (no requiere conexión a Internet)
- No requiere instalación de dependencias o servidores

## Uso

1. **Equipamientos**:
   - Ingrese el prefijo (ej: "PIG")
   - Ingrese el código (ej: "WM3-DES")
   - Ingrese una descripción (máximo 100 caracteres)
   - Haga clic en "Agregar Equipamiento"

2. **Planes de Mantenimiento**:
   - Seleccione un equipamiento existente
   - Ingrese una clave para el plan (ej: "PLAN001")
   - Seleccione una periodicidad (Diario, Semanal, etc.)
   - Ingrese las tareas en formato tabulado (TaskKey, Descripción, Duración)
   - Haga clic en "Agregar Plan"

3. **Preventivos**:
   - Defina el ID inicial para la secuencia de preventivos
   - Seleccione un equipamiento
   - Seleccione uno o más planes de mantenimiento
   - Configure la frecuencia para cada plan seleccionado
   - Haga clic en "Agregar Preventivo"

4. **Exportar**:
   - Seleccione el tipo de datos que desea exportar
   - Previsualice los datos
   - Copie al portapapeles o descargue como archivo CSV

## Estructura de Archivos

- `index.html`: Estructura de la aplicación y formularios
- `styles.css`: Estilos de la interfaz de usuario
- `script.js`: Lógica de la aplicación y manipulación de datos

## Formato de Datos

La aplicación genera los siguientes tipos de registros CSV:

1. **Equipamientos**:
   ```
   Key,Descripcion
   "PIG-WM3-DES","Desbobinador IMPRESORA WM3"
   ```

2. **Planes**:
   ```
   MaintenancePlanKey,Descripcion
   "PLAN001","Desbobinador IMPRESORA WM3 - Semestral"
   ```

3. **Tareas**:
   ```
   MaintenancePlanKey,TaskKey,Descripcion,Duracion
   "PLAN001","T001","Verificar niveles de aceite","0:30:00"
   "PLAN001","T002","Inspeccionar correas","0:15:00"
   ```

4. **Preventivos**:
   ```
   PreventiveMaintenanceId,Descripcion,Asset
   "PR00000100","Prev. Desbobinador IMPRESORA WM3 (PIG)","PIG-WM3-DES"
   ```

5. **Planned Work**:
   ```
   PreventiveMaintenanceId,MaintenancePlan,Frequency,OccursEvery
   "PR00000100","PLAN001","Monthly","6"
   ```

## Limitaciones

- Los datos se mantienen en memoria y se pierden al recargar la página
- No hay funcionalidad para guardar o cargar configuraciones
- No hay conexión con bases de datos externas
- Diseñado solo para uso en navegadores modernos

## Requisitos Técnicos

- Navegador web moderno con soporte para JavaScript ES6
- No requiere instalación ni conexión a internet

## Cómo Iniciar

1. Descargue los tres archivos (`index.html`, `styles.css` y `script.js`)
2. Colóquelos en la misma carpeta
3. Abra el archivo `index.html` en su navegador web

## Licencia

Este proyecto es de libre uso y modificación.

---

Desarrollado como herramienta de ayuda para la generación de datos GMAO.
Fecha: 2025-03-11
