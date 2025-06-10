import starlight from "@astrojs/starlight";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  redirects: {
    "/": {
      destination: "/getting-started/overview",
      status: 301,
    },
  },
  integrations: [
    starlight({
      title: "Viper",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/ozmos-dev/viper",
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Overview", link: "/getting-started/overview" },
            { label: "Installation", link: "/getting-started/installation" },
            { label: "Why Viper?", link: "/getting-started/why-viper" },
            { label: "How It Works", link: "/getting-started/how-it-works" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Routing", link: "/guides/routing" },
            { label: "Props / Queries", link: "/guides/props" },
            { label: "Actions / Forms", link: "/guides/actions" },
            { label: "TypeScript", link: "/guides/typescript" },
            { label: "Code Editors", link: "/guides/editors" },
            { label: "SFC vs Adjacent", link: "/guides/modes" },
          ],
        },
      ],
    }),
  ],
});
