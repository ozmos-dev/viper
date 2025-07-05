import { type QueryClient, useMutation, useQuery } from "@tanstack/vue-query";
import { type MaybeRef, type Ref, computed, inject, ref, toValue } from "vue";
import { useRouter } from "vue-router";

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
          [K in T["bindings"][number]]: MaybeRef<string | number | null>;
        };
      };

// Type aliases for cleaner TanStack Query integration
type QueryOptions<T> = Partial<Parameters<typeof useQuery<T>>[0]>;

type MutationOptions<TResult, TArgs> = Parameters<
  typeof useMutation<TResult, unknown, TArgs>
>[0];

// Clean parameter types for function signatures
type UseQueryParams<T extends { bindings: BaseBindings; result: unknown }> =
  T["bindings"]["length"] extends 0
    ? [options?: QueryOptions<T["result"]> & BindOptions<T>]
    : [options: QueryOptions<T["result"]> & BindOptions<T>];

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

export class Page {
  params = ref<Record<string, string>>({});
  formatTitle = (title: string) => title;
  props: Record<string, unknown> = {};
  actions = {};
  hashes: Record<string, string> = {};
  queryClient: QueryClient;
  headerFunctions: HeaderFunction[] = [];

  constructor(config: PageInit) {
    this.queryClient = config.queryClient;
    if (config.formatTitle) {
      this.formatTitle = config.formatTitle;
    }
  }

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
    this.params.value = json.params;

    for (const key in this.props) {
      this.queryClient.setQueryData([this.hashes[key]], () => this.props[key]);
    }
  }

  setPageTitle(title: string) {
    document.title = this.formatTitle(title || "");
  }
}

export function usePage<P extends BasePageType>() {
  type Props = P["props"];
  type Actions = P["actions"];
  type Params = P["params"];
  const page = inject("viperPage") as Page;
  const router = useRouter();

  async function viperFetch({
    bind,
    body,
    headers,
    method = "GET",
  }: {
    bind?: Record<string, unknown>;
    body?: string | FormData;
    headers?: Record<string, string>;
    method?: string;
  }) {
    const boundHeaders: Record<string, string> = {};
    const bindKeys = [];
    const bindValues = [];
    for (const [key, value] of Object.entries(bind ?? {})) {
      if (toValue(value)) {
        bindKeys.push(key);
        bindValues.push(toValue(value));
      }
    }
    if (bindKeys.length > 0) {
      boundHeaders["X-Viper-Bind-Keys"] = bindKeys.join(",");
      boundHeaders["X-Viper-Bind-Values"] = bindValues.join(",");
    }
    return fetch(router.currentRoute.value.fullPath, {
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

    params: page.params as Ref<Params>,

    useQuery<K extends keyof Props>(key: K, ...args: UseQueryParams<Props[K]>) {
      const options = args[0];
      const { bind, ...opts } = options ?? {};
      const enabled = ref(false);
      const queryKey = computed(() => {
        return [
          page.hashes[key as string],
          ...Object.entries(bind ?? {})
            .map(([key, value]) => `${key}:${toValue(value)}`)
            .filter(Boolean),
        ];
      });

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
          });
          enabled.value = true;
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
        data: query.data as Ref<Props[K]["result"]>,
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

      const _initialState = { ...toValue(initialState ?? {}) };
      const state = ref(initialState);
      const errors = ref<Record<string, string>>({});

      const mutation = useMutation<Result, unknown, Args>({
        ...mutationOptions,
        mutationFn: async (data = {}) => {
          errors.value = {};

          const res = await viperFetch({
            method: "POST",
            body: JSON.stringify({
              ...toValue(state),
              ...toValue(data ?? {}),
            }),
            headers: {
              "X-Viper-Action": key as string,
            },
          });
          if (res.status === 422) {
            const data = (await res.json()) as {
              message: string;
              errors: Record<string, string[]>;
            };
            errors.value = Object.entries(data.errors).reduce(
              (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
              {},
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
        mutate(override: Args = {}) {
          return mutation.mutate(override);
        },
        mutateAsync(override: Args = {}) {
          return mutation.mutateAsync(override);
        },
        reset: () => {
          state.value = { ..._initialState };
        },
        errors,
        state,
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

      const _initialState = { ...toValue(initialState ?? {}) };
      const state = ref(initialState);
      const errors = ref<Record<string, string>>({});

      const mutation = useMutation<Result, unknown, Args>({
        ...mutationOptions,
        mutationFn: async (data = {}) => {
          errors.value = {};

          const json = {
            ...toValue(state),
            ...toValue(data ?? {}),
          };

          const formData = new FormData();

          for (const key of files) {
            if (Array.isArray(json[key])) {
              for (const file of json[key]) {
                formData.append(`${key}[]`, file);
              }
            } else if (json[key]) {
              formData.set(key, json[key]);
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
          });

          if (res.status === 422) {
            const data = (await res.json()) as {
              message: string;
              errors: Record<string, string[]>;
            };
            errors.value = Object.entries(data.errors).reduce(
              (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
              {},
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
        mutate(override: Args = {}) {
          return mutation.mutate(override);
        },
        mutateAsync(override: Args = {}) {
          return mutation.mutateAsync(override);
        },
        reset: () => {
          state.value = { ..._initialState };
        },
        errors,
        state,
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
