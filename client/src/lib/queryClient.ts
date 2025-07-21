import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: any,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<any>;
export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<any>;
export async function apiRequest(
  methodOrUrl: string,
  urlOrOptions?: string | {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  },
  data?: any,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<any> {
  let method: string;
  let url: string;
  let body: string | undefined;
  let headers: Record<string, string> = {};

  // Handle overloaded signatures
  if (typeof urlOrOptions === "string") {
    // First signature: apiRequest(method, url, data, options)
    method = methodOrUrl;
    url = urlOrOptions;
    body = data ? JSON.stringify(data) : undefined;
    headers = options?.headers || {};
  } else {
    // Second signature: apiRequest(url, options)
    url = methodOrUrl;
    method = urlOrOptions?.method || "GET";
    body = urlOrOptions?.body;
    headers = urlOrOptions?.headers || {};
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
