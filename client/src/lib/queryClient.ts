import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  const res = await fetch(url, {
    method: options?.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: options?.body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log('QueryClient - Making request to:', url);
    console.log('QueryClient - Document.cookie:', document.cookie);
    
    const res = await fetch(url, {
      credentials: "include",
    });

    console.log('QueryClient - Response status:', res.status);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('QueryClient - 401 received, returning null');
      return null;
    }

    if (res.status === 404 && url.includes('/api/auth/user')) {
      console.log('QueryClient - User not found (404), treating as unauthenticated');
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log('QueryClient - Response data:', data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
