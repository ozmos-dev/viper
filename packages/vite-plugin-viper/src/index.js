import fs from "node:fs/promises";
import path from "node:path";
import { createFilter } from "vite";
import { readDir } from "./util.js";
import { Viper } from "./viper.js";

export default async function viperPlugin(options = {}) {
  const viper = await Viper.make();

  function isPage(id) {
    const filter = createFilter(viper.pageGlob());

    return filter(id) && id.startsWith(viper.absolutePagesDirectory());
  }

  return {
    name: "viper-plugin",

    configureServer(server) {
      viper.devServer = server;
    },

    async buildStart() {
      const files = await readDir(viper.absolutePagesDirectory());
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const code = await fs.readFile(path.resolve(file), "utf-8");
        await viper.compileFile(path.resolve(file), code, false);
      }
      viper.generate();
    },

    async transform(code, id) {
      let transformedCode = code;

      if (isPage(id)) {
        transformedCode = await viper.compileFile(path.resolve(id), code);
      }

      return {
        code: transformedCode,
        map: null,
      };
    },

    async handleHotUpdate(ctx) {
      if (isPage(ctx.file)) {
        await viper.compileFile(ctx.file, await ctx.read());
      }
    },
  };
}
