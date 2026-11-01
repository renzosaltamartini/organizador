# Organizador Personal

Aplicación web con Firebase, agenda, calendario, recordatorios, alertas, gastos, notas y pizarras de Google Drive.

## Estructura

```text
index.html                    Estructura HTML, vistas y formularios
assets/
  css/
    base.css                  Estilos extraídos del HTML
    redesign.css              Sistema visual y ajustes adaptables
    landing.css               Portada e ingreso
    panel.css                 Panel de la aplicación
    colors.css                Paleta y ajustes de color
  js/
    theme.js                  Tema inicial, antes de pintar la página
    landing.js                Reloj de la portada y aviso de instalación en iOS
    app.js                    Inicio, navegación, vistas, formularios y sincronización
    config/firebase.js        Configuración del cliente de Firebase
    utils/format.js           Fechas, importes, colores y formato de texto
    features/
      alerts.js               Cálculo de próximas alertas y sus etiquetas
      notifications.js        Permisos, registro y tokens de notificaciones push
      pdf.js                  Generación del reporte PDF
  logo-*.jpg                  Imágenes existentes
  logo-organizador.png
api/avisos.js                 Endpoint del servidor para avisos
lib/drive.js                  Integración del navegador con Google Drive
lib/logica.js                 Procesamiento de avisos en el servidor
lib/tiempo.js                 Conversión de zonas horarias en el servidor
sw.js                         Service worker de notificaciones, con alcance raíz
manifest.json                 Instalación de la aplicación
icon-*.png                    Iconos de la aplicación
firebase.json                 Configuración de alojamiento
package.json                  Dependencias del servidor
```

## Desarrollo y despliegue

No se necesita compilar el frontend ni instalar un framework. Para verlo localmente, ejecutá `python3 -m http.server 8000` desde la raíz y abrí `http://localhost:8000`. Abrir el HTML como archivo no permite cargar correctamente los módulos. Firebase debe autorizar el dominio utilizado para iniciar sesión.

Usá el despliegue habitual y conservá las variables de entorno del servidor. Los estilos se cargan en el mismo orden que antes: base, redesign, landing, panel y colors. El tema inicial se ejecuta en el encabezado y el módulo principal se carga después del HTML.

`sw.js`, el manifiesto y los iconos conservan sus rutas para mantener el alcance del service worker y la instalación existente. Los endpoints del servidor y la integración de Drive también conservan sus rutas.

## Datos y compatibilidad

La reorganización conserva el proyecto de Firebase, las rutas `users/<uid>/...`, los campos guardados, el tema almacenado y la navegación por hash. No requiere migrar datos. Para conservar el almacenamiento y los permisos asociados al navegador, mantené el mismo dominio de publicación.

## Verificación de la reorganización

Se compararon el HTML, los estilos y las capturas de la portada y las ocho vistas del panel a 390, 768 y 1440 px con datos simulados. También se compararon las rutas y los datos enviados al guardar gastos e ingresos, y las instrucciones de generación del PDF. No se inició sesión ni se escribieron datos en Firebase real; Google Drive y la entrega real de notificaciones requieren validación con una cuenta y un dispositivo autorizados.

