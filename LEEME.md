# Organizador Personal

Aplicación con Firebase, agenda, calendario, recordatorios, alertas, gastos, notas y pizarras de Google Drive.

## Nueva distribución

- Entrada con presentación tipográfica y panel de acceso con Google independiente.
- Navegación superior en escritorio y menú desplegable en dispositivos pequeños.
- Resumen con agenda principal, columna de pendientes y notas, próximas fechas y un resumen de dinero sobre el área de trabajo. Los datos provienen de las mismas colecciones sincronizadas de la aplicación.
- Accesos para abrir los editores de actividades, recordatorios, gastos y notas desde el resumen.
- Agenda con línea de tiempo y panel independiente para crear o editar actividades.
- Calendario con fechas importantes debajo y formulario en una columna propia.
- Recordatorios y alertas con registros y formularios separados.
- Dinero con resumen superior, registro de movimientos y una columna para gastos e ingresos.
- Notas con biblioteca horizontal y editor de ancho completo.
- Pizarras con conexión, navegación de carpetas y biblioteca en áreas distintas.

## Diseño

Paleta de azul y blanco, con superficies claras y un encabezado azul. Poppins para textos y controles; Space Grotesk para títulos, marca y cifras. Se conservan los colores personalizados de las actividades y los indicadores de estado.

## Archivos activos

`index.html` contiene las vistas y los formularios. `assets/css/base.css` conserva los estilos base del editor, la agenda y los controles. `assets/css/workspace.css` define la nueva estructura, sus componentes y las adaptaciones a tamaños de pantalla. Las hojas `redesign.css`, `landing.css`, `panel.css` y `colors.css` anteriores ya no se cargan.

`assets/js/app.js` conserva los manejadores de autenticación, sincronización, navegación, edición y guardado, y añade las lecturas del resumen y los accesos a los editores. `assets/js/landing.js` conserva el aviso de instalación para iOS.

## Desarrollo y despliegue

El frontend no requiere compilación. Para servirlo localmente, ejecutá `python -m http.server 8000` desde la raíz y abrí `http://localhost:8000`. Firebase debe autorizar el dominio utilizado para iniciar sesión.

Se mantiene el alojamiento habitual y las variables de entorno existentes. El proyecto de Firebase, las rutas `users/<uid>/...`, los formatos de datos, las notificaciones, el PDF, la integración con Drive y los endpoints del servidor mantienen sus contratos. No se requiere migrar los datos.

## Estado de esta versión

No se ejecutaron pruebas automáticas, pruebas de navegador ni operaciones con una cuenta real, por indicación del usuario. Los cambios de diseño se publican a través del despliegue habitual del repositorio.

## Bancos, billeteras y apariencia

Dinero permite elegir varias entidades, muestra sus logos en Dinero y en Inicio y guarda la selección en `users/<uid>/moneyPreferences`. Los ingresos y gastos existentes mantienen su formato y no se redistribuyen por entidad. La selección personaliza la presentación; no conecta con cuentas bancarias ni consulta saldos externos.

`assets/js/config/institutions.json` incluye 335 opciones: las 73 entidades financieras de la nómina BCRA consultada, 238 proveedores de cuentas de pago únicos (la respuesta oficial tenía 239 filas, una duplicada) y 24 billeteras y plataformas adicionales. La nómina de entidades financieras publicada por BCRA indica julio de 2026; la consulta se realizó el 5 de noviembre de 2026. Es una copia local y requiere actualización para incorporar altas y bajas posteriores.

Fuentes del catálogo:
- https://www.bcra.gob.ar/api/endpoints/nomina-entidades.php?action=nomina_AAA00&lang=es
- https://www.bcra.gob.ar/api/endpoints/proveedores-psp.php?tipoPSP=1

Se incluyen 71 logos locales obtenidos de los iconos públicos de los dominios de las marcas mediante el servicio de favicons de Google. Los logos no disponibles usan iniciales, sin simular una marca. Desde la selección se puede agregar una entidad o asignarle un logo propio, escribiendo su mismo nombre. No se solicitan imágenes a terceros al mostrar las selecciones.

`assets/js/features/accounts.js` gestiona selección, búsqueda, categorías, entidades propias y sincronización. `assets/js/features/amounts.js` reemplaza el salto de escala por un contador numérico progresivo y respeta movimiento reducido.

El interruptor de luna/sol está disponible en el ingreso y en el encabezado. `theme.js` conserva la preferencia `tema` en el navegador y, si no hay una elegida, sigue el tema del dispositivo. `preferences.css` contiene las nuevas interfaces y las variantes oscuras.

No se ejecutaron pruebas ni se realizaron operaciones con cuentas reales, por indicación del usuario.
