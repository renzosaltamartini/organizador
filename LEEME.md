# Organizador Personal · versión 2

Aplicación con Firebase, agenda, calendario, recordatorios, alertas, gastos, notas y pizarras de Google Drive.

## Nueva distribución

- Entrada centrada con acceso de Google y una presentación de las herramientas.
- Navegación superior en escritorio y menú desplegable en dispositivos pequeños.
- Resumen con agenda de hoy, pendientes, próximo evento, próxima alerta, saldo y notas recientes. Los datos provienen de las mismas colecciones sincronizadas de la aplicación.
- Accesos para abrir los editores de actividades, recordatorios, gastos y notas desde el resumen.
- Agenda con línea de tiempo y panel independiente para crear o editar actividades.
- Calendario con fechas importantes debajo y formulario en una columna propia.
- Recordatorios y alertas con registros y formularios separados.
- Dinero con resumen superior, registro de movimientos y una columna para gastos e ingresos.
- Notas con biblioteca horizontal y editor de ancho completo.
- Pizarras con conexión, navegación de carpetas y biblioteca en áreas distintas.

## Archivos activos

`index.html` contiene las vistas y los formularios. `assets/css/base.css` conserva los estilos base del editor, la agenda y los controles. `assets/css/workspace.css` define la nueva estructura, sus componentes y las adaptaciones a tamaños de pantalla. Las hojas `redesign.css`, `landing.css`, `panel.css` y `colors.css` anteriores ya no se cargan.

`assets/js/app.js` conserva los manejadores de autenticación, sincronización, navegación, edición y guardado, y añade las lecturas del resumen y los accesos a los editores. `assets/js/landing.js` conserva el aviso de instalación para iOS.

## Desarrollo y despliegue

El frontend no requiere compilación. Para servirlo localmente, ejecutá `python -m http.server 8000` desde la raíz y abrí `http://localhost:8000`. Firebase debe autorizar el dominio utilizado para iniciar sesión.

Se mantiene el alojamiento habitual y las variables de entorno existentes. El proyecto de Firebase, las rutas `users/<uid>/...`, los formatos de datos, las notificaciones, el PDF, la integración con Drive y los endpoints del servidor mantienen sus contratos. No se requiere migrar los datos.

## Estado de esta versión

Preparada en una rama independiente para revisión. No se ejecutaron pruebas automáticas, pruebas de navegador ni operaciones con una cuenta real, por indicación del usuario. La publicación actual no se reemplaza al crear esta propuesta.
