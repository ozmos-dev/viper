import { type QueryClient, useMutation, useQuery } from "@tanstack/vue-query";
import { type Ref, inject, ref, toValue } from "vue";
import { useRouter } from "vue-router";

type BaseProps = Record<string, unknown>;
type BaseActions = Record<string, { args: unknown; result: unknown }>;
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

export class Page {
  params = ref<Record<string, string>>({});
  formatTitle = (title: string) => title;
  props: Record<string, unknown> = {};
  actions = {};
  hashes: Record<string, string> = {};
  queryClient: QueryClient;

  constructor(config: PageInit) {
    this.queryClient = config.queryClient;
    if (config.formatTitle) {
      this.formatTitle = config.formatTitle;
    }
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

  return {
    setPageTitle: page.setPageTitle,

    params: page.params as Ref<Params>,

    useQuery<K extends keyof Props>(key: K) {
      const enabled = ref(false);

      const query = useQuery<Props[K]>({
        enabled,
        initialData: () => page.props[key as string] as Props[K],
        queryKey: [page.hashes[key as string]],
        queryFn: async () => {
          const res = await fetch(router.currentRoute.value.path, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Viper-Request": "true",
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
        data: query.data as IsAny<Props[K]> extends true
          ? any
          : Ref<Readonly<Props[K]>>,
      };
    },

    useMutation(
      key: keyof Actions,
      options: Parameters<
        typeof useMutation<
          Actions[typeof key]["result"],
          unknown,
          Actions[typeof key]["args"]
        >
      >[0] = {},
    ) {
      type Result = Actions[typeof key]["result"];
      type Args = Actions[typeof key]["args"];

      return useMutation<Result, unknown, Args>({
        ...options,
        mutationFn: async (data = {}) => {
          const res = await fetch(router.currentRoute.value.path, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(data),
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Viper-Request": "true",
              "X-Viper-Action": key as string,
              "X-XSRF-TOKEN": decodeURIComponent(getXsrfToken() || ""),
            },
          });
          if (!res.ok) {
            if (res.status === 422) {
              const data = (await res.json()) as {
                message: string;
                errors: Record<string, string[]>;
              };
              throw data.errors;
            }
            throw await res.json();
          }
          return (await res.json()) as Result;
        },
      });
    },

    useForm(
      key: keyof Actions,
      options: Parameters<
        typeof useMutation<
          Actions[typeof key]["result"],
          unknown,
          Actions[typeof key]["args"]
        >
      >[0] & {
        state: Actions[typeof key]["args"];
      },
    ) {
      type Result = Actions[typeof key]["result"];
      type Args = Actions[typeof key]["args"];

      const _initialState = { ...toValue(options.state ?? {}) };
      const state = ref(options.state);
      const errors = ref<Record<string, string>>({});

      const mutation = useMutation<Result, unknown, Args>({
        ...options,
        mutationFn: async (data = {}) => {
          errors.value = {};

          const res = await fetch(router.currentRoute.value.path, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({
              ...toValue(state),
              ...toValue(data ?? {}),
            }),
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Viper-Request": "true",
              "X-Viper-Action": key as string,
              "X-XSRF-TOKEN": decodeURIComponent(getXsrfToken() || ""),
            },
          });
          if (!res.ok) {
            if (res.status === 422) {
              const data = (await res.json()) as {
                message: string;
                errors: Record<string, string[]>;
              };
              errors.value = Object.entries(data.errors).reduce(
                // biome-ignore lint/performance/noAccumulatingSpread: it's fine here
                (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
                {},
              );
              throw data.errors;
            }
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
    useFormData(
      key: keyof Actions,
      options: Parameters<
        typeof useMutation<
          Actions[typeof key]["result"],
          unknown,
          Actions[typeof key]["args"]
        >
      >[0] & {
        state: Actions[typeof key]["args"];
        // todo: how can we auto detect this?
        files: string[];
      },
    ) {
      type Result = Actions[typeof key]["result"];
      type Args = Actions[typeof key]["args"];

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
                formData.append(key, file);
              }
            } else if (json[key]) {
              formData.set(key, json[key]);
            }
            delete json[key];
          }

          formData.set("state", JSON.stringify(json));

          const res = await fetch(router.currentRoute.value.path, {
            method: "POST",
            credentials: "include",
            body: formData,
            headers: {
              Accept: "application/json",
              "X-Viper-Request": "true",
              "X-Viper-Action": key as string,
              "X-XSRF-TOKEN": decodeURIComponent(getXsrfToken() || ""),
            },
          });
          if (!res.ok) {
            if (res.status === 422) {
              const data = (await res.json()) as {
                message: string;
                errors: Record<string, string[]>;
              };
              errors.value = Object.entries(data.errors).reduce(
                // biome-ignore lint/performance/noAccumulatingSpread: it's fine here
                (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
                {},
              );
              throw data.errors;
            }
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
