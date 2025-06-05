import type { QueryClient } from "@tanstack/vue-query";
import type { Router } from "vue-router";
import { Page } from "./page";

export const ViperPlugin = {
  install(
    app: any,
    {
      formatTitle,
      router,
      queryClient,
    }: {
      router: Router;
      formatTitle(title: string): string;
      queryClient: QueryClient;
    },
  ) {
    const page = new Page({
      formatTitle,
      queryClient,
    });

    app.provide("viperPage", page);

    const pageJson = JSON.parse(
      document.getElementById("app")?.dataset.page ?? "{}",
    );

    page.updateFromPageJson(pageJson);

    router.beforeEach(async (to, from, next) => {
      const res = await fetch(to.fullPath, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Viper-Request": "true",
        },
      });

      const redirectUrl = res.headers.get("x-viper-location");
      if (redirectUrl) {
        const url = new URL(redirectUrl);
        return next(url.pathname);
      }

      if (!res.ok) {
        return next(false);
      }

      page.updateFromPageJson(await res.json());

      return next();
    });
  },
};

export { usePage } from "./page";
