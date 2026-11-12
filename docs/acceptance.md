# Validación al conectar Supabase

Estas son pruebas manuales de integración pendientes del entorno real, no afirmaciones de ejecución.

- Crear un administrador y una encargada. Verificar que las cuentas nuevas quedan inactivas.
- Entrar/salir, recargar una ruta protegida y recuperar contraseña en el mismo navegador.
- Con una encargada, intentar una RPC administrativa directamente: debe rechazarla.
- Crear modelo, variantes, registrar producción y comparar stock/movimientos.
- Cambiar precio base después de una venta: el histórico conserva su precio anterior.
- Registrar dos ventas del mismo código: cierre agrega cantidades correctamente.
- Adjuntar una imagen grande, verificar compresión y bucket privado. Acceso sin sesión debe fallar.
- Intentar subir un archivo de una venta de otro Live o después del cierre: debe fallar.
- Anular una venta con motivo y cerrar: no debe descontar sus pares.
- Cerrar un Live con una variante insuficiente después de otra suficiente: no debe descontar ninguna.
- Cerrar desde dos sesiones simultáneas: un solo descuento.
- Cerrar dos Lives compitiendo por el mismo stock: solo puede consolidarse el que encuentre stock suficiente.
- Reintentar venta o producción desde el mismo formulario tras una interrupción: una sola operación.
- Comparar reportes diarios, por Live, talla y medio de pago con las líneas originales; abrir CSV en Excel.
- Imprimir a escala 100 % y escanear Code 128 con los lectores USB/Bluetooth reales.
- Abrir cámara bajo HTTPS, dar/denegar permiso y verificar la alternativa manual.
- Probar anchuras de 390, 768 y 1440 px; teclado, foco de diálogos y lector de pantalla.
- Instalar PWA en Android/iOS según navegador, cerrar y abrir. Sin red, las escrituras deben fallar claramente.
- Publicar una nueva versión, guardar trabajo y actualizar con el aviso de la PWA.
- Desactivar a una encargada con sesión abierta: las siguientes operaciones y lecturas deben denegarse.
- Recargar `/inventario` en Cloudflare; probar CSP, recuperación y enlaces temporales de comprobantes.
