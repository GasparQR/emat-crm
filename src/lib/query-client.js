import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Avoid redundant fetches when the same key mounts in multiple components
			staleTime: 30 * 1000, // 30 seconds
		},
	},
});