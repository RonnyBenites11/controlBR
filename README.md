# BABY RONNYS

Sistema de inventario y control de ventas Live de calzado infantil. Aplicación en español, moneda PEN (S/) y fechas del negocio en `America/Lima`. Creado desde un repositorio vacío.

## Qué incluye

- Inicio de sesión, recuperación de contraseña, sesiones y rutas protegidas.
- Perfiles de administrador y encargada, activación manual y permisos comprobados en PostgreSQL.
- Modelos con SKU, precio y archivo; variantes por color/talla con Code 128 generado por secuencia única.
- Inventario, búsquedas, filtros, alertas de reposición, producción, ajustes y movimientos auditables.
- Lives abiertos/cerrados/cancelados; ventas con múltiples variantes, cliente, notas y precios históricos.
- Yape, Plin, transferencia y efectivo como medios de pago registrados manualmente.
- Anulación de ventas abiertas con motivo, sin borrar historial.
- Compresión de comprobantes a JPEG, bucket privado y lectura con enlaces de 120 segundos.
- Cierre transaccional con bloqueo, validación de stock, rollback e idempotencia.
- Dashboard y reportes por fecha de venta, Live, modelo histórico, talla, medio de pago y comprobante.
- Exportación CSV compatible con Excel, comillas escapadas y neutralización de fórmulas.
- Etiquetas imprimibles Code 128, lector USB/Bluetooth en modo teclado y cámara mediante ZXing.
- Diseño adaptable, navegación móvil, formularios etiquetados, foco visible y diálogos con foco contenido.
- PWA instalable, actualización explícita, shell sin conexión y datos operativos exclusivamente en Supabase.

**No se conecta con la API de TikTok ni verifica automáticamente un pago de Yape.** Una encargada registra la venta y revisa la evidencia del pago.

## Arquitectura

| Capa             | Tecnología                                         | Motivo                                                              |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| Interfaz         | React + TypeScript + Vite                          | Tipado estricto, desarrollo sencillo, salida estática               |
| Diseño           | Tailwind CSS v4 + CSS de componentes               | Sistema visual suave sin dependencia de una biblioteca pesada       |
| Navegación       | React Router                                       | Rutas protegidas y carga diferida                                   |
| Estado           | Context de sesión/datos                            | Suficiente para el MVP; sin Redux                                   |
| Backend          | Supabase Auth, PostgreSQL y Storage                | Identidad, base relacional y archivos privados sin servidor propio  |
| Reglas críticas  | Funciones SQL/RPC                                  | Una transacción y permisos reales independientemente de la interfaz |
| Hosting previsto | Cloudflare Pages                                   | Publica el `dist` estático con HTTPS                                |
| Verificación     | Vitest + PostgreSQL embebido (PGlite) + Playwright | Prueba dominio, migraciones, RLS y flujos visuales                  |

Se siguió la integración de [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite) y las recomendaciones de Supabase sobre [funciones](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [Storage privado](https://supabase.com/docs/guides/storage/buckets/fundamentals). El frontend usa únicamente la URL y la clave pública; nunca `service_role` ni una clave secreta.

## Requisitos

- Node.js **22.12 o superior** dentro de la rama 22 LTS y npm.
- Un proyecto de Supabase para trabajar con datos reales. No hace falta Docker para abrir la interfaz ni ejecutar las pruebas embebidas.
- Git ya inicializado. No es necesario volver a inicializarlo.

## Ejecutar localmente

En PowerShell, desde la carpeta del proyecto:

```powershell
npm ci
Copy-Item .env.example .env
```

Edita `.env` con los valores de **Supabase → Project Settings → API** (o el diálogo Connect):

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON_O_PUBLISHABLE
```

Las variables `VITE_*` son públicas y se incorporan al build. La clave pública es segura únicamente con las migraciones y RLS correctamente aplicadas. **Nunca pegues una clave secreta o `service_role` aquí.**

```powershell
npm run dev
```

Abre `http://127.0.0.1:5173`. Reinicia Vite después de cambiar `.env`. Sin configuración, aparece una guía de conexión; no se simula una base de datos ni se usa inventario ficticio.

## Preparar Supabase

1. Crea un proyecto en una organización gratuita. No actives complementos de pago.
2. Abre SQL Editor y ejecuta **completo y en este orden**, una sola vez por proyecto:
   - `supabase/migrations/202611110001_initial.sql`
   - `supabase/migrations/202611110002_private_receipts.sql`
3. Comprueba que existen las ocho tablas públicas y el bucket **receipts**, marcado como **privado**.
4. En Authentication, desactiva **Allow new users to sign up**. Crea usuarios de forma controlada desde Authentication → Users. La aplicación no expone registro público y todo perfil nuevo nace inactivo.
5. Configura Authentication → URL Configuration:
   - Site URL local: `http://127.0.0.1:5173`.
   - Redirect URL local: `http://127.0.0.1:5173/restablecer`.
   - Para producción, agrega `https://TU-SITIO.pages.dev/restablecer` y cambia Site URL a tu origen de producción.
6. Configura una política de contraseñas de al menos 12 caracteres para las cuentas nuevas. Las pruebas de UI no sustituyen esta configuración del servidor.
7. Copia las dos variables públicas a `.env`.

Si utilizas `localhost` en lugar de `127.0.0.1`, agrega también ese origen y su ruta `/restablecer`. La recuperación usa PKCE: abre el enlace en el mismo navegador que solicitó el correo. El servicio de correo predeterminado de Supabase tiene restricciones; verifica la entrega y límites de tu proyecto antes de habilitar recuperación para todo el equipo. No se contrata SMTP de pago.

### Crear el primer administrador de forma segura

Primero ejecuta ambas migraciones. Después crea el usuario en **Authentication → Users → Add user → Create new user**, con correo y contraseña fuerte. Marca la confirmación del correo solo si controlas esa identidad. Copia su UUID.

En SQL Editor, reemplaza `UUID_DEL_USUARIO` y el nombre:

```sql
do $$
declare
  first_user uuid := 'UUID_DEL_USUARIO'::uuid;
begin
  if exists(select 1 from public.profiles where role = 'admin' and active) then
    raise exception 'Ya existe un administrador. Usa la pantalla Equipo.';
  end if;
  update public.profiles
  set display_name = 'Ronny', role = 'admin', active = true
  where id = first_user;
  if not found then raise exception 'No existe ese perfil. Crea el usuario después de las migraciones.'; end if;
end;
$$;
```

El privilegio solo se asigna desde el entorno administrativo de Supabase, no desde metadatos enviados por el navegador. No hay cuentas o contraseñas predeterminadas. Para el equipo, crea cada cuenta en Auth y activa su perfil en **Equipo**. Un administrador no puede cambiar su propio acceso. En caso de perder acceso, un propietario del proyecto puede recuperarlo desde SQL Editor después de comprobar la identidad.

### Datos de demostración (solo desarrollo)

Ejecuta opcionalmente `supabase/seed.sql` en una **base de desarrollo**. Crea tres modelos y treinta variantes, sin usuarios, ventas ni stock ficticio. Registra la producción desde la app para mantener la trazabilidad. Nunca ejecutes el seed en producción.

### Supabase local (opcional)

Con Docker y Supabase CLI instalados:

```powershell
npx supabase start
npx supabase db reset
```

`db reset` borra **la base local de desarrollo** y aplica migraciones/seed. No lo uses contra producción. Copia la URL y la clave pública local que muestre la CLI a `.env`; crea y activa un usuario como se explica arriba. Para vincular un proyecto remoto con CLI, revisa cada migración antes de ejecutar `supabase db push`; el procedimiento con SQL Editor evita requerir CLI.

## Flujo de trabajo

1. Administrador: crea un modelo, agrega variantes y registra el ingreso de producción.
2. Imprime etiquetas desde **Etiquetas**. Un código identifica una variante (modelo/color/talla), no un par individual.
3. Crea el Live y registra ventas. Escanea el código en el campo indicado o busca manualmente. El lector USB/Bluetooth debe actuar como teclado y terminar con **Enter**; no requiere WebUSB.
4. Ajusta el precio de cada línea antes de guardar. El nombre, código, color, talla y precio quedan copiados como historial.
5. Adjunta el comprobante desde la venta. Solo JPG/PNG/WebP; original hasta 20 MB, salida JPEG comprimida de aproximadamente 1 MB, bucket con límite de 2 MB.
6. Revisa las ventas y anula con motivo las incorrectas. Para corregir comprador, pago o líneas, anula y vuelve a registrar; no se sobrescribe una venta histórica.
7. Cierra el Live. Solo entonces se descuenta stock. Una falta de stock mantiene el Live abierto y revierte todos los descuentos y movimientos de ese intento.

Los pagos se consideran registrados al guardar la venta; **el comprobante no implica validación automática del depósito**. Un aviso informa de los pagos digitales sin comprobante, pero permite cerrar si el equipo lo confirma. Los comprobantes y las ventas se bloquean después del cierre. Un Live vacío puede cerrarse en cero. Cancelar un Live requiere administrador y ausencia de ventas activas. Los Lives cerrados no se reabren; correcciones físicas posteriores se registran como ajustes con motivo, sin alterar las ventas.

## Base de datos y seguridad

| Tabla             | Contenido                                   |
| ----------------- | ------------------------------------------- |
| `profiles`        | Rol y acceso, vinculados a `auth.users`     |
| `products`        | Modelos, SKU, precio sugerido y archivo     |
| `variants`        | Color, talla, barcode, stock y mínimo       |
| `lives`           | Estado, apertura, cierre y responsables     |
| `sales`           | Cliente, pago, notas y anulación con motivo |
| `sale_items`      | Cantidades y snapshots históricos           |
| `stock_movements` | Ingreso/ajuste/venta y saldo posterior      |
| `receipts`        | Referencia al archivo privado y responsable |

Son **ocho** tablas públicas de negocio (Auth y Storage agregan sus propias tablas). Todas tienen RLS. Los usuarios autenticados reciben lectura condicionada a su perfil; no reciben `INSERT`, `UPDATE` o `DELETE` directo. Las RPC son `security definer`, fijan `search_path = ''`, califican los esquemas y verifican el rol en el servidor. Los perfiles solo son visibles al propio usuario y al administrador. El equipo activo comparte inventario, Lives, clientes, reportes y comprobantes: una sola empresa, sin multiempresa.

`close_live` bloquea la fila del Live y luego las variantes en orden de UUID. Registrar/anular ventas y vincular comprobantes toman primero el mismo bloqueo del Live. Esto serializa las escrituras con el cierre y evita que se agreguen ventas al finalizarlo. Los cierres de Lives distintos compiten por las mismas filas de stock. Constraints impiden stock negativo y un índice único evita dos movimientos de cierre de la misma variante/Live. Cualquier excepción revierte la operación entera. Ventas y producción reciben un UUID de solicitud para reintentos dentro del mismo formulario; el cierre es idempotente por Live. Si recargas o cierras un formulario después de una pérdida de conexión, **revisa el historial antes de repetir una operación**, porque se generará otra solicitud.

Storage restringe tamaño, MIME y rutas `live_id/sale_id/uuid.jpg`. Solo se suben archivos para ventas activas de un Live abierto. Los archivos vinculados no se pueden borrar desde la app. Si falla el vínculo después de la subida, se intenta eliminar el archivo huérfano y se informa si esa limpieza falla. Los enlaces firmados duran 120 segundos; una URL ya emitida conserva esa vigencia aunque se desactive al usuario. Revisa huérfanos en Storage si se interrumpe el navegador durante una subida. No borres comprobantes vinculados sin un procedimiento de conservación definido por el negocio.

La PWA solo cachea archivos estáticos. No cachea respuestas de Supabase, sesiones HTTP ni comprobantes. La sesión de Supabase se persiste en el navegador según el mecanismo normal de Auth; el inventario y las ventas no se guardan en `localStorage`. Las operaciones requieren conexión. Usa cierre de sesión en equipos compartidos.

## Pruebas y verificaciones

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

`npm test` ejecuta validación monetaria/CSV/fechas y las **migraciones SQL reales** sobre una instancia PostgreSQL embebida efímera con PGlite. Se prueban permisos/RLS, rollback por falta de stock, doble cierre secuencial, anulación, historial, idempotencia, perfiles y políticas de comprobantes. Los contratos mínimos de `auth`/`storage` son fixtures de pruebas, no los servicios gestionados; esta suite no demuestra el envío de correos ni la integración HTTP de Storage.

Pruebas de interfaz con navegador:

```powershell
npx playwright install chromium
npm run test:e2e
```

Playwright inicia Vite en `127.0.0.1:4174`, usa respuestas HTTP controladas **solo en tests** y verifica escritorio/móvil, navegación, escaneo como teclado, envío de venta, etiquetas y errores. No son pruebas contra una cuenta Supabase de producción. Para usar Chrome ya instalado, define `PLAYWRIGHT_CHANNEL=chrome` y ejecuta el mismo comando. En CI se instala Chromium.

Después de `npm run build`, ejecuta `npm run test:production` para servir temporalmente `dist` en loopback con sus cabeceras CSP y comprobar el manifest, dimensiones de iconos, registro del service worker y navegación del shell sin conexión. Usa el mismo navegador que Playwright (`PLAYWRIGHT_CHANNEL=chrome` si utilizas Chrome instalado). No demuestra escritura offline ni acceso a datos remotos.

Concurrencia real en **Supabase local desechable**, después de aplicar migraciones:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
npm run test:db
```

Este script abre dos conexiones PostgreSQL para comprobar el doble cierre simultáneo y dos Lives compitiendo por un stock insuficiente para ambos. Solo acepta loopback, crea fixtures con UUID únicos y limpia únicamente sus registros. No usa `TRUNCATE`. No equivale a una prueba de carga. PGlite ejecuta una conexión y no sustituye esta comprobación concurrente.

`npm run icons` regenera los iconos PWA. `npm run format` aplica el formato del proyecto. GitHub Actions ejecuta los controles de tipos, lint, pruebas SQL/dominio, build y navegador.

Auditoría: las dependencias de producción no presentan avisos conocidos en la revisión realizada (`npm audit --omit=dev`). La auditoría completa conserva cuatro avisos **bajos** derivados de `deepmerge` en Workbox y su cadena de herramientas PWA. La versión más reciente disponible de `deepmerge` sigue afectada; la corrección automática propone degradar la PWA a una versión antigua incompatible. No se aplicó esa degradación. `glob` y `minimatch` se fijan mediante `overrides` a versiones que corrigen las alertas moderadas; se verifican con lint, pruebas y build. Revisa periódicamente actualizaciones de estas herramientas.

## Despliegue en Cloudflare Pages

1. Crea un repositorio GitHub y sube este proyecto **sin `.env` ni secretos**. Esta entrega no crea un remoto ni hace push.
2. En Cloudflare, abre **Workers & Pages → Create → Pages → Connect to Git** y selecciona el repositorio.
3. Preset: Vite/React (o configuración manual). Comando de build: `npm run build`. Directorio de salida: `dist`. Raíz: la raíz del repositorio. Versión de Node: `22`.
4. Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para producción y, si corresponde, preview. No reutilices la base de producción para pruebas de cambios destructivos.
5. Publica. `public/_redirects` permite recargar rutas internas; `public/_headers` agrega CSP y cabeceras de seguridad. Con Supabase autoalojado/dominio propio, adapta `connect-src` e `img-src` a su origen.
6. Configura Site URL y el redirect de recuperación en Supabase con el origen publicado.
7. Comprueba login/logout, una venta real de prueba, comprobante, cierre, reportes, instalación PWA y recarga de `/inventario` antes de operar con el negocio.

Alternativa de despliegue manual: ejecuta `npm ci` y `npm run build` con las variables presentes, y carga `dist` mediante **Pages → Direct Upload**. Una modificación de variables requiere reconstruir. No se ha desplegado desde este entorno ni se contrataron servicios.

Los planes [gratuitos de Supabase](https://supabase.com/pricing) y [límites de Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/) permiten intentar iniciar sin costo de infraestructura. **S/0 es un objetivo sujeto a los límites vigentes**, no una garantía de capacidad ilimitada. Revisa almacenamiento, egreso, usuarios, correo, pausa de proyectos y builds en tus paneles; no actives facturación o ampliaciones automáticamente. Un dominio propio es opcional; el subdominio `pages.dev` evita comprar uno.

## Alcance, decisiones y pendientes externos

- El archivo recibido incluye la preparación técnica y un resumen funcional, pero remite a apartados **1 a 51 de un prompt maestro no adjunto**. No se puede afirmar conformidad con secciones inexistentes en la entrega. Se implementó el alcance disponible; las reglas asumidas se describen en este README y `docs/decisions.md`.
- Se requieren proyecto/cuenta Supabase, credenciales públicas, ejecución de migraciones y primer administrador. Cloudflare/GitHub son necesarios solo para publicar.
- La base remota, envío/recuperación de correos, subida HTTP a Storage, cámara física, lector físico, impresora e instalación PWA en dispositivos reales deben validarse al conectar los servicios. La cámara requiere HTTPS (o localhost) y permiso del usuario.
- El MVP consulta datos paginados desde la API y muestra tablas paginadas; mantiene el conjunto de trabajo en memoria para reportes del negocio pequeño. Se refresca cada 30 segundos, al recuperar foco/conexión y después de escribir. No hay suscripción Realtime ni garantía de snapshot entre consultas de tablas; el **cierre siempre valida en el servidor**. Para un historial grande, mover reportes a agregaciones SQL y paginar por fecha en servidor.
- No hay venta offline, sincronización diferida, integración bancaria, integración TikTok, facturación electrónica, devoluciones financieras, gestión de despachos, multiempresa ni compra de dominio. Las ventas cerradas no son editables. La evidencia de pago no es una factura fiscal.
- Precios/cantidades se validan en formulario y servidor. Las RPC no confían en totales enviados por el cliente: los reportes los calculan a partir del histórico de líneas.
- No hay backups automáticos propios del sistema. Define exportaciones y respaldo de base/Storage según las opciones de tu plan; CSV no sustituye un backup relacional ni descarga las imágenes.

## Estructura

```text
src/
  auth/          Sesión y perfil
  components/    Layout, formularios, cámara y diálogos
  data/          Lectura de Supabase y refresco
  lib/           API, importes, validación, CSV y comprobantes
  pages/         Inventario, Lives, reportes, etiquetas y equipo
supabase/
  migrations/    Modelo, RPC, permisos, RLS y bucket privado
  seed.sql       Catálogo exclusivo de desarrollo
tests/           Pruebas SQL y navegador
scripts/         Iconos y concurrencia real opcional
docs/            Decisiones y checklist operativo
public/          Iconos, redirects y cabeceras de Cloudflare
```
