import { useQuery } from "@tanstack/react-query";
import { crm } from "@/api/crmClient";

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const user = await crm.auth.me();
        return user;
      } catch (error) {
        return null;
      }
    }
  });
}