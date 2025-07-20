import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  css: ["./assets/app.css"],
  modules: ["nuxt-llms"],
  llms: {
    domain: "https://viper.ozmos.dev",
    title: "Viper",
    description:
      "Viper is a framework for building web applications with PHP and Vue.js or React.",
  },
  content: {
    build: {
      markdown: {
        highlight: {
          langs: ["php", "vue", "tsx"],
        },
      },
    },
  },
});
