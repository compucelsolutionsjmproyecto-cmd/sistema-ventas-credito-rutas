# Manual de usuario

## Ingreso al sistema

Abre la URL de la aplicación (o el ícono instalado en tu celular), y
escribe el correo y contraseña que te asignó tu administrador. Si los
olvidaste, contáctalo directamente: por seguridad, el sistema no permite
auto-recuperación desde la app.

---

## Para Administradores y Supervisores

### Panel general
Al ingresar verás el resumen del día: ventas, cobros, ganancias,
clientes morosos, stock e inventario, todo actualizado en tiempo real.

### Rutas
`Menú → Rutas → Nueva ruta`. Asigna un nombre, un vendedor, y los
municipios/barrios que cubre (sepáralos con comas). Puedes activar o
desactivar una ruta con el botón de encendido en cada fila.

### Vendedores
`Menú → Vendedores → Nuevo vendedor`. Completa sus datos, foto, ruta y
las credenciales (correo/contraseña) con las que iniciará sesión.

### Inventario
`Menú → Inventario → Nuevo producto`. Registra código, nombre, foto,
categoría, precio de compra/venta (la ganancia se calcula sola),
cantidad y stock mínimo. Cuando el stock baje del mínimo, verás una
alerta ⚠️ junto a la cantidad y llegará una notificación automática.

### Asignación diaria de inventario
`Menú → Asignaciones`. Cada mañana, selecciona el vendedor, agrega los
productos y cantidades que le entregas, y confirma. El sistema
descuenta automáticamente del inventario general.

### Reportes
`Menú → Reportes`. Elige el tipo de reporte (ventas, cobros, morosos,
inventario, rendimiento por vendedor) y expórtalo a PDF o Excel con un
clic.

### Auditoría (solo Administrador)
`Menú → Auditoría`. Consulta quién hizo qué y cuándo en el sistema.

---

## Para Vendedores

### Mi jornada
Al empezar tu día, entra a `Menú → Mi jornada` y pulsa **Iniciar
jornada** (el sistema toma tu ubicación GPS). Al terminar, pulsa
**Finalizar jornada**. Verás cuántos clientes visitaste, cuántas ventas
hiciste y cuánto cobraste en el día.

### Clientes
`Menú → Clientes → Nuevo cliente`. Completa sus datos, toma la foto de
la casa (y opcionalmente del cliente), y pulsa **Capturar ubicación
actual** para guardar el punto GPS exacto — esto ayuda a que cualquier
compañero pueda encontrar la casa después.

### Ventas
`Menú → Ventas → Nueva venta`.
1. Selecciona el cliente.
2. Agrega productos de tu inventario del día (solo verás lo que se te
   asignó esa mañana).
3. Elige la modalidad de pago (diario, semanal, quincenal o mensual) y
   el número de cuotas.
4. Revisa el total y el valor de cada cuota, y confirma.

El sistema genera las cuotas automáticamente con sus fechas de
vencimiento.

### Cobros
`Menú → Cobros`. Verás las cuotas pendientes de tus clientes. Al tocar
una, ingresa el valor cobrado, el método de pago, y pide al cliente que
firme en la pantalla con el dedo. Confirma el cobro — el saldo se
actualiza al instante y, si era la última cuota, la venta queda marcada
como pagada.

### Notificaciones
`Menú → Notificaciones`. Aquí verás avisos sobre tus clientes con pagos
vencidos.

---

## Preguntas frecuentes

**¿Puedo usar la app sin internet?**
La aplicación necesita conexión para guardar información nueva (ventas,
cobros, clientes). Sí queda instalada como app en tu celular y carga más
rápido gracias a la tecnología PWA, pero los datos siempre se sincronizan
en línea.

**No veo productos para vender.**
Pide a tu administrador o supervisor que te haga la asignación diaria de
inventario desde `Menú → Asignaciones`.

**Registré mal un cliente, ¿puedo corregirlo?**
Sí, entra a `Clientes`, tócalo y edita su información.
