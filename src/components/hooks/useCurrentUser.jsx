import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return user;
      } catch (error) {
        return null;
      }
    }
  });
}