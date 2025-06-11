import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createContext, useEffect, useLayoutEffect, useState } from "react";
import { redirect } from "react-router";
import { create } from "zustand";

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
      document.getElementById("app")?.dataset.page ?? "{}"
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

  return {
    setPageTitle: page.setPageTitle,

    params: params as Params,

    useQuery<K extends keyof Props>(key: K) {
      const [enabled, setEnabled] = useState(false);

      const query = useQuery<Props[K]>({
        enabled,
        initialData: () => page.props[key as string] as Props[K],
        queryKey: [page.hashes[key as string]],
        queryFn: async () => {
          const res = await fetch(window.location.pathname, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Viper-Request": "true",
              "X-Viper-Only": key as string,
            },
          });
          setEnabled(true);
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
        data: query.data as IsAny<Props[K]> extends true ? unknown : Props[K],
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
      >[0] = {}
    ) {
      type Result = Actions[typeof key]["result"];
      type Args = Actions[typeof key]["args"];

      return useMutation<Result, unknown, Args>({
        ...options,
        mutationFn: async (data = {}) => {
          const res = await fetch(window.location.pathname, {
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
      }
    ) {
      type Result = Actions[typeof key]["result"];
      type Args = Actions[typeof key]["args"];

      // @ts-expect-error
      const _initialState = { ...options.state } as Args;
      const [state, setState] = useState<Args>(_initialState as Args);
      const [errors, setErrors] = useState<Record<string, string>>({});

      const mutation = useMutation<Result, unknown, Args>({
        ...options,
        mutationFn: async (data = {}) => {
          setErrors({});

          const res = await fetch(window.location.pathname, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({
              // @ts-expect-error
              ...state,
              // @ts-expect-error
              ...data,
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
              setErrors(
                Object.entries(data.errors).reduce(
                  // biome-ignore lint/performance/noAccumulatingSpread: it's fine here
                  (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
                  {}
                )
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
          // @ts-expect-error
          setState({ ..._initialState });
        },
        errors,
        state,
        setState,
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
      }
    ) {
      type Result = Actions[typeof key]["result"];
      type Args = Actions[typeof key]["args"];

      // @ts-expect-error
      const _initialState = { ...options.state };
      const [state, setState] = useState(_initialState);
      const [errors, setErrors] = useState<Record<string, string>>({});

      const mutation = useMutation<Result, unknown, Args>({
        ...options,
        mutationFn: async (data = {}) => {
          setErrors({});

          const json = {
            ...state,
            // @ts-expect-error
            ...data,
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

          const res = await fetch(window.location.pathname, {
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
              setErrors(
                Object.entries(data.errors).reduce(
                  // biome-ignore lint/performance/noAccumulatingSpread: it's fine here
                  (acc, [key, value]) => ({ ...acc, [key]: value[0] }),
                  {}
                )
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
          setState({ ..._initialState });
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
