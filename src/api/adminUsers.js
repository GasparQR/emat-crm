import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/api/supabaseClient";

async function readFunctionError(error) {
  if (error instanceof FunctionsHttpError && error.context) {
    try {
      const payload = await error.context.json();
      if (payload?.error) return String(payload.error);
      if (payload?.message) return String(payload.message);
    } catch {
      // ignore parse errors
    }
  }
  return error?.message || "Error al llamar la función";
}

async function invoke(name, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sesión expirada. Volvé a iniciar sesión.");
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(await readFunctionError(error));
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data;
}

export const adminUsersApi = {
  createUser: async (payload) => invoke("admin-create-user", payload),
  assignUserToAsesor: async (payload) => invoke("admin-assign-user-to-asesor", payload),
  updateUser: async (payload) => invoke("admin-update-user", payload),
  setUserActive: async ({ id, active }) => invoke("admin-deactivate-user", { id, active }),
  deleteAsesor: async ({ asesor_id, workspace_id }) =>
    invoke("admin-delete-asesor", { asesor_id, workspace_id }),
};
