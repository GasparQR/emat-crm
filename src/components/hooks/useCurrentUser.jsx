import { useQuery } from "@tanstack/react-query";
import { auth } from "@/api/supabaseClient";

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const user = await auth.me();
        return user;
      } catch (error) {
        return null;
      }
    }
  });
}