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
| App Metadata | `{ "role": "admin" }` |

Roles admitidos en la app: `admin` (acceso completo) o `logistica` (Hoy + Presupuestos).

## 3. Perfil en `public.usuario`

Ejecutar en SQL Editor la migración [`20260601120000_auth_usuario_on_signup.sql`](../supabase/migrations/20260601120000_auth_usuario_on_signup.sql).

El trigger crea el perfil CRM cuando se **agrega** un usuario en Auth (panel o API admin), no por auto-registro.

Si el usuario existía antes del trigger, el primer login hace upsert desde la app (`auth.ensureUsuarioProfile`).

## 4. Usuarios creados por error vía signup

Si alguien se registró antes de desactivar signups: borrar el usuario en **Authentication → Users** o dejarlo sin confirmar y no usarlo.
