# Decisiones de alcance y negocio

El adjunto recibido termina remitiendo a un prompt maestro de 51 secciones cuyo contenido no está presente. Este archivo registra las decisiones tomadas con la información disponible; no reconstruye ese documento.

| Decisión | Regla implementada |
| --- | --- |
| Empresa | Una sola empresa, BABY RONNYS; todo el equipo activo comparte datos |
| Moneda y zona | Soles con dos decimales; reportes por fecha de registro de venta en Perú |
| Roles | Admin: catálogo, producción, ajustes y accesos; ambos roles: Lives, ventas, comprobantes, cierres y reportes |
| Registro | Sin formulario público; el propietario crea cuentas en Supabase Auth y un administrador activa perfiles |
| Tallaje | Talla entera entre 10 y 45; color como texto normalizado y modelo independiente |
| Código | Code 128, prefijo BR y secuencia de 12 dígitos; permanente por variante |
| Precio | Precio base sugerido; cada venta conserva su precio configurable y snapshots |
| Stock | Sin reserva; descuento agregado por variante solo al cerrar el Live |
| Falta de stock | Se permite registrar demanda; el cierre falla íntegramente si falta inventario |
| Comprobante | Opcional con advertencia en pagos digitales; no valida automáticamente el pago |
| Corrección | Anular con motivo y registrar otra venta antes del cierre; historial inmutable después |
| Cierre | Puede ejecutarlo cualquier integrante activo; requiere confirmación; no se reabre |
| Cancelar Live | Solo administrador; no debe haber ventas activas |
| Devoluciones | No se automatizan reembolsos; ajustes físicos posteriores requieren admin y motivo |
| Disponibilidad | Escrituras solo en línea; shell instalable sin cachear información operativa |
| Refresh | Lecturas cada 30 s, al recuperar foco/conexión y después de mutaciones |
| Costos | Solo preparar planes gratuitos; sin contratación ni despliegue externo automático |

Si el documento maestro establece reglas diferentes sobre cierre, reservas, comprobantes, tallas o permisos, deben revisarse antes de usar el sistema en producción.
