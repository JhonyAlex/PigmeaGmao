# PigmeaGmao - Generador de Datos GMAO

![PigmeaGmao Logo](https://raw.githubusercontent.com/JhonyAlex/PigmeaGmao/main/assets/logo.png)

## 📋 Descripción

PigmeaGmao es una herramienta web especializada para crear y gestionar equipamientos, planes de mantenimiento y preventivos para su fácil importación al sistema Value Keep GMAO. Esta aplicación facilita la generación de datos estructurados para sistemas de Gestión de Mantenimiento Asistido por Ordenador (GMAO).

## 🌟 Características principales

- **Gestión de Equipamientos**: Crear, editar y eliminar equipos con códigos personalizados.
- **Planes de Mantenimiento**: Configurar planes con tareas específicas, asignarlos a varios equipamientos y vincular varios planes a un equipo de una sola vez.
- **Preventivos**: Generar preventivos con diferentes frecuencias (diaria, semanal, mensual, etc.).
- **Exportación de Datos**: Generar archivos CSV listos para importar en Value Keep GMAO.
- **Guardado Local**: Almacenamiento local de datos para recuperación entre sesiones.
- **Carga Masiva**: Importación por lotes de equipamientos y tareas.
- **Interfaz Intuitiva**: Sistema de pestañas y formularios fáciles de usar.

## 💻 Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- LocalStorage para persistencia de datos

## 🚀 Cómo utilizar

### 1️⃣ Pestaña de Equipamientos

1. Ingrese los datos del equipamiento (Prefijo, Código, Descripción)
2. Haga clic en "Agregar Equipamiento"
3. También puede realizar una carga masiva pegando datos en formato:
   ```
   Prefijo-Código Descripción
   ```

### 2️⃣ Pestaña de Planes de Mantenimiento

1. Seleccione un equipamiento de la lista desplegable
2. Defina la clave del plan y su periodicidad
3. Agregue tareas específicas con sus duraciones en formato H:MM:SS
4. Las tareas pueden agregarse individualmente o mediante carga masiva
5. Haga clic en "Agregar Plan" para finalizar

### 3️⃣ Pestaña de Preventivos

1. Configure un ID inicial para los preventivos
2. Seleccione un equipamiento
3. Elija los planes de mantenimiento a incluir (puede seleccionar varios)
4. Configure las frecuencias para cada plan
5. Haga clic en "Agregar Preventivo"
6. También puede usar "Generar Preventivos para Todos los Equipos" para automatizar el proceso

### 4️⃣ Pestaña de Exportación

1. Seleccione el tipo de datos a exportar:
   - Equipamientos
   - Planes
   - Tareas
   - Preventivos
   - Planned Work
2. Previsualice los datos en formato tabla o texto
3. Copie al portapapeles o descargue como CSV
4. También puede exportar todos los datos como un archivo JSON de respaldo

## 🔄 Flujo de trabajo recomendado

1. Cree primero todos los equipamientos necesarios
2. Configure planes de mantenimiento para cada equipamiento
3. Genere preventivos basados en los planes creados
4. Exporte los datos para su importación en Value Keep GMAO

## 📋 Formato de datos

### Equipamientos

- **Key**: Identificador único (Prefijo-Código)
- **Descripción**: Descripción del equipamiento (máx. 100 caracteres)

### Planes de Mantenimiento

- **PlanKey**: Identificador único del plan
- **Descripción**: Generada automáticamente basada en el equipamiento y periodicidad
- **Tareas**: Lista de tareas asociadas al plan

### Tareas

- **TaskKey**: Identificador único de la tarea
- **Descripción**: Descripción de la tarea a realizar
- **Duración**: Tiempo estimado en formato H:MM:SS

### Preventivos

- **PreventiveMaintenanceId**: ID automático con formato PR0000000
- **Descripción**: Generada automáticamente basada en el equipamiento
- **Asset**: Key del equipamiento asociado
- **PlannedWork**: Configuración de frecuencias para cada plan incluido

## 💾 Persistencia de datos

La aplicación almacena todos los datos en el localStorage del navegador. Puede:

- Exportar los datos como un archivo JSON para respaldo
- Importar datos previamente exportados
- Borrar todos los datos almacenados si es necesario

## ⚙️ Configuraciones avanzadas

- **Ordenamiento de tablas**: Haga clic en los encabezados para ordenar los datos
- **Relaciones visuales**: Al seleccionar un equipamiento, se resaltan automáticamente sus planes y preventivos relacionados
- **Indicadores de estado**: Las tablas muestran indicadores para identificar rápidamente equipos con planes o preventivos

## 📄 Licencia

Este proyecto es de código abierto y está disponible para su uso bajo la licencia MIT.

## 🔗 Enlaces útiles

- [Repositorio en GitHub](https://github.com/JhonyAlex/PigmeaGmao)
- [Página del desarrollador](https://github.com/JhonyAlex)

## 👨‍💻 Autor

- JhonyAlex

---

Desarrollado con ❤️ para facilitar la gestión de mantenimiento
