# Usuarios del CRM (solo alta manual en Supabase)

El CRM **no tiene registro público**. Solo pueden entrar usuarios creados por un administrador en Supabase.

## 1. Desactivar registro automático (obligatorio)

En [Supabase → Authentication → Providers → Email](https://app.supabase.com/project/ywbgeqjqjfnhldqqqklj/auth/providers):

1. Desactivar **Enable Sign Up** / **Allow new users to sign up**.
2. Dejar habilitado el proveedor Email para **inicio de sesión** (`signInWithPassword`).

Sin este paso, cualquiera podría llamar a `/auth/v1/signup` y crear una cuenta aunque la app no muestre un formulario de registro.

Opcional: en **Authentication → Settings**, revisar que no haya flujos de invitación abierta que no uses.

## 2. Dar de alta un usuario

**Authentication → Users → Add user**

| Campo | Valor ejemplo |
|-------|----------------|
| Email | `comercial@emat.com` |
| Password | (definir en producción; no commitear) |
| Auto Confirm User | Sí |
| App Metadata | `{ "role": "ADMIN" }` |

Roles admitidos en la app: `ADMIN`, `ASESOR`, `LOGISTICA`.
Si el rol es `ASESOR`, debe existir además `asesor_codigo` en `public.usuario`.

## 3. Perfil en `public.usuario`

Ejecutar en SQL Editor las migraciones:

- [`20260601120000_auth_usuario_on_signup.sql`](../supabase/migrations/20260601120000_auth_usuario_on_signup.sql)
- [`20260602110000_roles_permissions_schema.sql`](../supabase/migrations/20260602110000_roles_permissions_schema.sql)
- [`20260602111000_rls_and_reassign.sql`](../supabase/migrations/20260602111000_rls_and_reassign.sql)

El trigger crea el perfil CRM cuando se **agrega** un usuario en Auth (panel o API admin), no por auto-registro.

Si el usuario existía antes del trigger, el primer login hace upsert desde la app (`auth.ensureUsuarioProfile`).
Para alta y edición desde UI ADMIN, desplegar Edge Functions:

```bash
supabase link --project-ref ywbgeqjqjfnhldqqqklj
supabase functions deploy admin-create-user
supabase functions deploy admin-update-user
supabase functions deploy admin-deactivate-user
```

Si al crear usuario ves *"Edge Function returned a non-2xx"* o *"Access denied"*:

1. Confirmá que las tres funciones aparecen en **Edge Functions** del dashboard.
2. Tu usuario en `public.usuario` debe tener `role = 'ADMIN'` y `active = true` (o `app_metadata.role = ADMIN` en Auth).
3. Para ASESOR, el **código de asesor** debe existir en la tabla `asesor` (catálogo en Configuración → Asesores).

## 4. Usuarios creados por error vía signup

Si alguien se registró antes de desactivar signups: borrar el usuario en **Authentication → Users** o dejarlo sin confirmar y no usarlo.
