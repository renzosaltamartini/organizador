# Organizador · rediseño

Nueva identidad visual en verde bosque, superficies claras y tipografía Manrope/Outfit. Incluye portada, inicio, navegación lateral, navegación móvil, formularios, calendario, agenda, notas, modales y modo oscuro.

## Archivos

- index.html: estructura y textos actualizados; conserva la integración de Firebase y sus funciones.
- redesign.css: sistema visual adaptable a celular, tablet y computadora.
- icon.svg e icon-180/192/512.png: nueva identidad de la aplicación.
- manifest.json: colores actualizados.
- api/, lib/, sw.js y configuración de alojamiento: conservados del proyecto original.

## Uso

Reemplazá los archivos de tu proyecto por el contenido de esta carpeta y usá tu despliegue habitual. Conservá las variables de entorno del servidor. Para verlo localmente, serví la carpeta con un servidor HTTP; abrir index.html como archivo no reproduce el inicio de sesión de Firebase. Los proveedores y dominios autorizados de Firebase deben corresponder al dominio donde lo publiques.

La vista-previa.html entregada por separado es una demostración visual sin conexión a la base de datos y sin guardado.

## Verificación

Revisión de las siete pantallas a 390, 768 y 1440 px, navegación y modo claro/oscuro con datos simulados. No se inició sesión ni se enviaron escrituras a la base real; notificaciones, autenticación y exportación PDF no se validaron contra servicios reales.
