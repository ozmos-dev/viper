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
type HasBindings<T extends { bindings: BaseBindings }> =
  T["bindings"] extends readonly []
    ? false
    : T["bindings"] extends readonly [any, ...any[]]
      ? true
      : false;

type BindingMap<T extends { bindings: BaseBindings }> = {
  [K in T["bindings"][number]]: MaybeRef<string | number | null>;
};

type ConditionalBindOptions<T extends { bindings: BaseBindings }> =
  HasBindings<T> extends true
    ? { bind: BindingMap<T> }
    : { bind?: BindingMap<T> };

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

    useQuery<K extends keyof Props>(
      key: K,
      options?: Partial<Parameters<typeof useQuery<Props[K]["result"]>>[0]> &
        ConditionalBindOptions<Props[K]>,
    ) {
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

      // for some reason data is always | null | undefined even when specifying initialData so this is a workaround
      type IsAny<T> = 0 extends 1 & T ? true : false;
      return {
        ...query,
        data: query.data as IsAny<Props[K]["result"]> extends true
          ? any
          : Ref<Readonly<Props[K]["result"]>>,
      };
    },

    useMutation<K extends keyof Actions>(
      key: K,
      {
        bind,
        ...options
      }: Parameters<
        typeof useMutation<Actions[K]["result"], unknown, Actions[K]["args"]>
      >[0] &
        ConditionalBindOptions<Actions[K]> = {} as any,
    ) {
      type Result = Actions[K]["result"];
      type Args = Actions[K]["args"];

      return useMutation<Result, unknown, Args>({
        ...options,
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
      {
        bind,
        ...options
      }: Parameters<
        typeof useMutation<Actions[K]["result"], unknown, Actions[K]["args"]>
      >[0] & {
        state: Actions[K]["args"];
      } & ConditionalBindOptions<Actions[K]>,
    ) {
      type Result = Actions[K]["result"];
      type Args = Actions[K]["args"];

      const _initialState = { ...toValue(options.state ?? {}) };
      const state = ref(options.state);
      const errors = ref<Record<string, string>>({});

      const mutation = useMutation<Result, unknown, Args>({
        ...options,
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
      {
        bind,
        ...options
      }: Parameters<
        typeof useMutation<Actions[K]["result"], unknown, Actions[K]["args"]>
      >[0] & {
        state: Actions[K]["args"];
        // todo: how can we auto detect this?
        files: string[];
      } & ConditionalBindOptions<Actions[K]>,
    ) {
      type Result = Actions[K]["result"];
      type Args = Actions[K]["args"];

      const _initialState = { ...toValue(options.state ?? {}) };
      const state = ref(options.state);
      const errors = ref<Record<string, string>>({});

      const mutation = useMutation<Result, unknown, Args>({
        ...options,
        mutationFn: async (data = {}) => {
          errors.value = {};

          const json = {
            ...toValue(state),
            ...toValue(data ?? {}),
          };

          const formData = new FormData();

          for (const key of options.files) {
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
