import { supabase } from "@/api/supabaseClient";

async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export const adminUsersApi = {
  createUser: async (payload) => invoke("admin-create-user", payload),
  updateUser: async (payload) => invoke("admin-update-user", payload),
  setUserActive: async ({ id, active }) => invoke("admin-deactivate-user", { id, active }),
};
