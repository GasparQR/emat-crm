import { supabase } from "@/api/supabaseClient";

async function invoke(name, body) {
  // Obtener el token de sesión
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.access_token) {
    throw new Error('No session available');
  }

  // Invocar con Authorization header
  const { data, error } = await supabase.functions.invoke(name, { 
    body,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    }
  });
  
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export const adminUsersApi = {
  createUser: async (payload) => invoke("admin-create-user", payload),
  updateUser: async (payload) => invoke("admin-update-user", payload),
  setUserActive: async ({ id, active }) => invoke("admin-deactivate-user", { id, active }),
};
