# Roles y permisos CRM

## Roles

- `ADMIN`: acceso global, configuración, usuarios, asesores, reportes.
- `ASESOR`: cartera propia; si `can_view_other_advisors=true`, visibilidad global comercial.
- `LOGISTICA`: acceso restringido a flujo operativo (hoy/presupuestos ganados-ejecutados).

## Modelo de datos

Tabla `public.usuario`:

- `role` (`ADMIN | ASESOR | LOGISTICA`)
- `can_view_other_advisors` (`boolean`)
- `active` (`boolean`)
- `asesor_codigo` (`text | null`)
- `last_sign_in_at` (`timestamptz`)

Tabla `public.asesor`:

- `codigo` único (clave de cartera comercial)
- `active`
- metadatos de contacto/firma

Regla de consistencia:

- `ASESOR` => `asesor_codigo` obligatorio.
- `ADMIN`/`LOGISTICA` => `asesor_codigo` nulo.

## Seguridad

### Frontend

- Guards de rol: `RequireRole`.
- Menú dinámico por rol (`getNavItemsForRole`).
- Filtros de visibilidad en cliente como defensa adicional:
  - `filterConsultasByVisibility`
  - `filterContactosByVisibility`

### Backend

- RLS habilitado para `usuario`, `asesor`, `consulta`, `contacto`.
- Funciones helper:
  - `current_usuario()`
  - `is_admin()`
  - `can_view_all_advisors()`
  - `asesor_codigo_visible()`

### Alta/edición de usuarios

Edge Functions:

- `admin-create-user`
- `admin-update-user`
- `admin-deactivate-user`

Todas validan que el caller sea `ADMIN` activo.

## Reasignación de cartera

RPC seguras:

- `preview_reassign_cartera(workspace, from_codigo)`
- `reassign_cartera(workspace, from_codigo, to_codigo)`

`reassign_cartera`:

- Ejecuta update atómico de `contacto` y `consulta`.
- Persiste auditoría en `cartera_reasignacion_log`.
- Devuelve conteos actualizados.

## Rutas protegidas

- `/configuracion/usuarios` (ADMIN)
- `/configuracion/asesores` (ADMIN)
- `/Reportes` (ADMIN)

## Desactivación de usuario

Fuente de verdad: `usuario.active=false`.

- RLS deniega acceso a datos.
- `loadSession` cierra sesión al detectar usuario inactivo.
- No se usa ban por tiempo en Auth.

