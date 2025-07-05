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
      const headers = await page.getHeaders();
      const res = await fetch(to.fullPath, {
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Viper-Request": "true",
        },
        credentials: "include",
      });

      const redirectUrl = res.headers.get("x-viper-location");
      if (redirectUrl) {
        const url = new URL(redirectUrl);
        return next(url.pathname);
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

        return next(false);
      }

      page.updateFromPageJson(await res.json());

      return next();
    });
  },
};

export { usePage } from "./page";
