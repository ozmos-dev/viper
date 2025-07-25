import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLayoutEffect, useMemo, useState } from "react";
import { redirect } from "react-router";
import { create } from "zustand";

type BaseBindings = string[];
type BaseProps = Record<string, { result: unknown; bindings: BaseBindings }>;
type BaseActions = Record<
  string,
  { args: unknown; result: unknown; bindings: BaseBindings }
>;
type BaseParams = Record<string, string>;

interface BasePageType {
  props: BaseProps;
  actions: BaseActions;
  params: BaseParams;
}

interface BasePage extends BasePageType {
  hashes: Record<string, string>;
  title?: string | null;
}

interface PageInit {
  formatTitle?: (title: string) => string;
  queryClient: QueryClient;
}

type HeaderFunction = () => Promise<Record<string, string>>;

// Helper types for conditional binding requirements
type BindOptions<T extends { bindings: BaseBindings }> =
  T["bindings"]["length"] extends 0
    ? { bind?: never }
    : {
        bind: {
          [K in T["bindings"][number]]: string | number | null;
        };
      };

// Type aliases for cleaner TanStack Query integration
type QueryOptions<T> = Partial<Parameters<typeof useQuery<T>>[0]>;

type QueryStringOptions = {
  qs?: Record<string, string | number | unknown[] | null>;
};

type MutationOptions<TResult, TArgs> = Parameters<
  typeof useMutation<TResult, unknown, TArgs>
>[0];

// Clean parameter types for function signatures
type UseQueryParams<T extends { bindings: BaseBindings; result: unknown }> =
  T["bindings"]["length"] extends 0
    ? [
        options?: QueryOptions<T["result"]> &
          BindOptions<T> &
          QueryStringOptions,
      ]
    : [
        options: QueryOptions<T["result"]> &
          BindOptions<T> &
          QueryStringOptions,
      ];

type UseMutationParams<
  T extends { bindings: BaseBindings; result: unknown; args: unknown },
> = T["bindings"]["length"] extends 0
  ? [options?: MutationOptions<T["result"], T["args"]> & BindOptions<T>]
  : [options: MutationOptions<T["result"], T["args"]> & BindOptions<T>];

type UseFormParams<
  T extends { bindings: BaseBindings; result: unknown; args: unknown },
> = T["bindings"]["length"] extends 0
  ? [
      options?: MutationOptions<T["result"], T["args"]> & {
        state: T["args"];
      } & BindOptions<T>,
    ]
  : [
      options: MutationOptions<T["result"], T["args"]> & {
        state: T["args"];
      } & BindOptions<T>,
    ];

type UseFormDataParams<
  T extends { bindings: BaseBindings; result: unknown; args: unknown },
> = T["bindings"]["length"] extends 0
  ? [
      options?: MutationOptions<T["result"], T["args"]> & {
        state: T["args"];
        files: string[];
      } & BindOptions<T>,
    ]
  : [
      options: MutationOptions<T["result"], T["args"]> & {
        state: T["args"];
        files: string[];
      } & BindOptions<T>,
    ];

const usePageStore = create<{
  params: Record<string, string>;
}>((set) => ({
  params: {},
}));

export class Page {
  formatTitle = (title: string) => title;
  props: Record<string, unknown> = {};
  actions = {};
  hashes: Record<string, string> = {};
  queryClient: QueryClient | null = null;
  headerFunctions: HeaderFunction[] = [];

  mergeHeaders(func: HeaderFunction) {
    this.headerFunctions.push(func);

    return () => {
      this.headerFunctions = this.headerFunctions.filter((f) => f !== func);
    };
  }

  async getHeaders() {
    const headers = await Promise.all(
      this.headerFunctions.map((func) => func()),
    );

    return headers.reduce((acc, header) => ({ ...acc, ...header }), {});
  }

  updateFromPageJson(json: BasePage) {
    this.props = json.props;
    this.actions = json.actions;
    this.hashes = json.hashes;
    this.setPageTitle(json.title || "");
    usePageStore.setState({ params: json.params });

    for (const key in this.props) {
      this.queryClient?.setQueryData([this.hashes[key]], () => this.props[key]);
    }
  }

  setPageTitle(title: string) {
    document.title = this.formatTitle(title || "");
  }
}

const page = new Page();

export function ViperProvider({
  children,
  formatTitle,
}: { children: React.ReactNode } & PageInit) {
  const queryClient = useQueryClient();
  page.queryClient = queryClient;
  if (formatTitle) {
    page.formatTitle = formatTitle;
  }

  useLayoutEffect(() => {
    const pageJson = JSON.parse(
      document.getElementById("app")?.dataset.page ?? "{}",
    );

    page.updateFromPageJson(pageJson);
  }, []);

  return <>{children}</>;
}

export async function reactRouterLoader({ request }: { request: Request }) {
  const res = await fetch(request.url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Viper-Request": "true",
    },
  });

  const redirectUrl = res.headers.get("x-viper-location");
  if (redirectUrl) {
    const url = new URL(redirectUrl);
    return redirect(url.pathname);
  }

  if (!res.ok) {
    // Get the response content
    const responseContent = await res.text();

    // Create a native dialog element
    const dialog = document.createElement("dialog");
    dialog.style.cssText = `
          width: 80vw;
          height: 80vh;
          max-width: 90vw;
          max-height: 90vh;
          padding: 0;
          border: none;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          margin: 0;
        `;
    dialog.innerHTML = `
          <div style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
            <h3 style="margin: 0 0 20px 0;">Request Failed (${res.status} ${res.statusText})</h3>
            <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; flex: 1; white-space: pre-wrap; margin: 0;">${responseContent}</pre>
            <div style="margin-top: 20px; text-align: right; flex-shrink: 0;">
              <button onclick="this.closest('dialog').close();" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
          </div>
        `;

    // Ensure dialog is removed from DOM when closed (regardless of how it's dismissed)
    dialog.addEventListener("close", () => {
      dialog.remove();
    });

    // Append to document body and show
    document.body.appendChild(dialog);
    dialog.showModal();

    throw new Error("Failed to fetch page");
  }

  page.updateFromPageJson(await res.json());

  return {};
}

export function usePage<P extends BasePageType>() {
  type Props = P["props"];
  type Actions = P["actions"];
  type Params = P["params"];
  const params = usePageStore((state) => state.params);

  async function viperFetch({
    bind,
    body,
    headers,
    method = "GET",
    qs = {},
  }: {
    bind?: Record<string, unknown>;
    body?: string | FormData;
    headers?: Record<string, string>;
    method?: string;
    qs?: Pick<QueryStringOptions, "qs">["qs"];
  }) {
    const boundHeaders: Record<string, string> = {};
    const bindKeys = [];
    const bindValues = [];
    for (const [key, value] of Object.entries(bind ?? {})) {
      if (value != null) {
        bindKeys.push(key);
        bindValues.push(String(value));
      }
    }
    if (bindKeys.length > 0) {
      boundHeaders["X-Viper-Bind-Keys"] = bindKeys.join(",");
      boundHeaders["X-Viper-Bind-Values"] = bindValues.join(",");
    }
    const url = new URL(window.location.href);
    if (qs) {
      for (const [key, value] of Object.entries(qs)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(`${key}[]`, String(item));
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return fetch(url.toString(), {
      method,
      credentials: "include",
      headers: {
        ...(await page.getHeaders()),
        ...headers,
        ...boundHeaders,
        ...(body instanceof FormData
          ? {}
          : {
              "Content-Type": "application/json",
            }),
        Accept: "application/json",
        "X-Viper-Request": "true",
        "X-XSRF-TOKEN": decodeURIComponent(getXsrfToken() || ""),
      },
      body,
    });
  }

  return {
    setPageTitle: page.setPageTitle,

    params: params as Params,

    useQuery<K extends keyof Props>(key: K, ...args: UseQueryParams<Props[K]>) {
      const options = args[0];
      const { bind, qs, ...opts } = options ?? {};
      const [enabled, setEnabled] = useState(false);
      const queryKey = useMemo(() => {
        return [
          page.hashes[key as string],
          ...Object.entries(bind ?? {})
            .map(([key, value]) => `bind:${key}:${value}`)
            .filter(Boolean),
          ...(qs
            ? Object.entries(qs).map(
                ([key, value]) => `qs:${key}:${value}`,
              )
            : []),
        ];
      }, [key, bind, qs]);

      const query = useQuery<Props[K]["result"]>({
        ...opts,
        enabled,
        initialData: () => page.props[key as string] as Props[K]["result"],
        queryKey,
        queryFn: async () => {
          const res = await viperFetch({
            bind,
            headers: {
              "X-Viper-Only": key as string,
            },
            qs,
          });
          setEnabled(true);
          if (!res.ok) {
            throw await res.json();
          }
          const data = await res.json();
          return data.props[key];
        },
      });

      // Trust that initialData makes this non-null and preserve TanStack Query's return type
      return {
        ...query,
        data: query.data as Props[K]["result"],
      };
    },

    useMutation<K extends keyof Actions>(
      key: K,
      ...args: UseMutationParams<Actions[K]>
    ) {
      const options = args[0] || { bind: {} };
      type Result = Actions[K]["result"];
      type Args = Actions[K]["args"];
      const { bind, ...mutationOptions } = options;

      return useMutation<Result, unknown, Args>({
        ...mutationOptions,
        mutationFn: async (data = {}) => {
          const res = await viperFetch({
            method: "POST",
            body: data instanceof FormData ? data : JSON.stringify(data),
            headers: {
              ...(data instanceof FormData
                ? {}
                : { "Content-Type": "application/json" }),
              Accept: "application/json",
              "X-Viper-Action": key as string,
            },
            bind,
          });
          if (res.status === 422) {
            const data = (await res.json()) as {
              message: string;
              errors: Record<string, string[]>;
            };
            throw data.errors;
          }
          if (!res.ok) {
            throw await res.json();
          }
          return (await res.json()) as Result;
        },
      });
    },

    useForm<K extends keyof Actions>(
      key: K,
      ...args: UseFormParams<Actions[K]>
    ) {
      const options =
        args[0] ||
        ({} as MutationOptions<Actions[K]["result"], Actions[K]["args"]> & {
          state: Actions[K]["args"];
        } & BindOptions<Actions[K]>);
      type Result = Actions[K]["result"];
      type Args = Actions[K]["args"];
      const { bind, state: initialState, ...mutationOptions } = options;

      const _initialState = { ...(initialState ?? {}) } as Args;
      const [state, setState] = useState<Args>(initialState ?? ({} as Args));
      const [errors, setErrors] = useState<Record<string, string>>({});

      const mutation = useMutation<Result, unknown, Args>({
        ...mutationOptions,
        mutationFn: async (data = {}) => {
          setErrors({});

          const res = await viperFetch({
            method: "POST",
            body: JSON.stringify({
              ...(state ?? {}),
              ...(data ?? {}),
            }),
            headers: {
              "X-Viper-Action": key as string,
            },
            bind,
          });
          if (res.status === 422) {
            const data = (await res.json()) as {
              message: string;
              errors: Record<string, string[]>;
            };
            setErrors(
              Object.entries(data.errors).reduce(
                (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
                {},
              ),
            );
            throw data.errors;
          }
          if (!res.ok) {
            throw await res.json();
          }
          return (await res.json()) as Result;
        },
      });

      return {
        ...mutation,
        mutate(override: Partial<Args> = {}) {
          return mutation.mutate(override);
        },
        mutateAsync(override: Partial<Args> = {}) {
          return mutation.mutateAsync(override);
        },
        reset: () => {
          setState({ ...(_initialState ?? {}) } as Args);
        },
        errors,
        state,
        setState,
      };
    },
    useFormData<K extends keyof Actions>(
      key: K,
      ...args: UseFormDataParams<Actions[K]>
    ) {
      const options =
        args[0] ||
        ({} as MutationOptions<Actions[K]["result"], Actions[K]["args"]> & {
          state: Actions[K]["args"];
          files: string[];
        } & BindOptions<Actions[K]>);
      type Result = Actions[K]["result"];
      type Args = Actions[K]["args"];
      const { bind, state: initialState, files, ...mutationOptions } = options;

      const _initialState = { ...(initialState ?? {}) };
      const [state, setState] = useState(initialState ?? ({} as Args));
      const [errors, setErrors] = useState<Record<string, string>>({});

      const mutation = useMutation<Result, unknown, Args>({
        ...mutationOptions,
        mutationFn: async (data = {}) => {
          setErrors({});

          const json = {
            ...(state ?? {}),
            ...(data ?? {}),
          } as Record<string, unknown>;

          const formData = new FormData();

          for (const key of files) {
            if (Array.isArray(json[key])) {
              for (const file of json[key] as File[]) {
                formData.append(`${key}[]`, file);
              }
            } else if (json[key]) {
              formData.set(key, json[key] as string | File);
            }
            delete json[key];
          }

          formData.set("state", JSON.stringify(json));

          const res = await viperFetch({
            method: "POST",
            body: formData,
            headers: {
              "X-Viper-Action": key as string,
            },
            bind,
          });

          if (res.status === 422) {
            const data = (await res.json()) as {
              message: string;
              errors: Record<string, string[]>;
            };
            setErrors(
              Object.entries(data.errors).reduce(
                (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
                {},
              ),
            );
            throw data.errors;
          }
          if (!res.ok) {
            throw await res.json();
          }
          return (await res.json()) as Result;
        },
      });

      return {
        ...mutation,
        mutate(override: Partial<Args> = {}) {
          return mutation.mutate(override);
        },
        mutateAsync(override: Partial<Args> = {}) {
          return mutation.mutateAsync(override);
        },
        reset: () => {
          setState({ ..._initialState } as Args);
        },
        errors,
        state,
        setState,
      };
    },
  };
}

function getXsrfToken() {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith("XSRF-TOKEN=")) {
      return cookie.substring("XSRF-TOKEN=".length, cookie.length);
    }
  }
  return null;
}
