# Verificación de la entrega

Fecha del trabajo: 11 de noviembre de 2026. Entorno: Windows, Node 22.22.3, npm 10.9.8 y Chrome instalado. No se conectó una cuenta remota de Supabase ni se publicó el proyecto.

| Comando | Resultado observado |
| --- | --- |
| `npm install` | Dependencias y lockfile creados; herramientas vulnerables actualizadas |
| `npm ci` | Instalación limpia completada, 505 paquetes instalados |
| `npm run typecheck` | Sin errores de TypeScript |
| `npm run lint` | Sin errores ni advertencias de ESLint |
| `npm test` | 19 pruebas aprobadas en dos archivos; incluye migraciones reales en PGlite |
| `npm run build` | Build estático y service worker generados; sin advertencias de tamaño de chunks |
| `npm run check` | Tipos, lint, pruebas y build anteriores ejecutados juntos con salida 0 |
| `$env:PLAYWRIGHT_CHANNEL = 'chrome'; npm run test:e2e` | 8 pruebas aprobadas: 4 flujos en escritorio y móvil |
| `$env:PLAYWRIGHT_CHANNEL = 'chrome'; npm run test:production` | Build servido con CSP; manifest, iconos, service worker y shell offline comprobados |
| `npm audit --omit=dev` | 0 vulnerabilidades conocidas de producción |
| `npm audit` | 4 avisos bajos en la cadena de Workbox/deepmerge de desarrollo; sin críticos, altos o moderados |
| `git check-ignore .env node_modules dist test-results` | Los cuatro excluidos correctamente |
| Búsqueda de claves privadas conocidas y `TODO`/`FIXME` en código/configuración | Sin coincidencias |

Las capturas de navegador se revisaron visualmente. Se corrigió un desbordamiento móvil y se comprobó que el ancho del documento no excediera `document.documentElement.clientWidth`. Los tests de interfaz interceptan respuestas de Supabase con fixtures exclusivos del entorno de pruebas; no verifican Auth/Storage alojados.

El build emite dos avisos informativos sobre comentarios `@__PURE__` en Zod: Rollup elimina esos comentarios y completa el build. La instalación informa que ESLint 9 está fuera de soporte; se mantuvo la versión compatible con el conjunto actual de plugins y se comprobó el lint. Estos avisos no se presentan como errores corregidos.

## Pendiente de otro entorno

- `npm run test:db`: no ejecutado. Docker está instalado, pero su daemon no está en ejecución y no hay PostgreSQL local disponible. El script comprueba concurrencia con dos conexiones reales; las pruebas PGlite validan transacciones y cierres secuenciales, no conexiones concurrentes.
- Login/recuperación por correo, Auth y subida/descarga HTTP a Storage reales: pendientes de proyecto y credenciales de Supabase.
- Cámara, lector USB/Bluetooth, impresora e instalación PWA en dispositivos físicos: pendientes de los equipos reales. Se verificó la generación SVG Code 128, la entrada como teclado en navegador y el service worker.
- GitHub, Cloudflare Pages y URL pública: preparados y documentados; sin remoto, push ni despliegue realizados.
- Conformidad con los apartados 1–51 del prompt maestro: imposible de verificar porque esos apartados no estaban incluidos en el adjunto recibido.

Consulta `acceptance.md` para la validación operativa al conectar servicios reales.
