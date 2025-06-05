import { exec, execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createFilter } from "vite";

const execAsync = promisify(exec);

const PHP_REGEX = /<php>([\s\S]*?)<\/php>/g;

export class Viper {
  static instance = null;
  devServer = null;
  routes = [];

  constructor(config) {
    this.config = config;
  }

  static async make() {
    if (Viper.instance) {
      return Viper.instance;
    }
    const { stdout } = await execAsync("php artisan viper:config");
    const config = JSON.parse(stdout);
    const viper = new Viper(config);
    await viper.init();
    Viper.instance = viper;
    return viper;
  }

  async init() {
    await fs.mkdir(this.absoluteOutputPath(["compiled"]), { recursive: true });
  }

  relativePagesDirectory() {
    return this.config.pages_path || "resources/js/pages";
  }

  absolutePagesDirectory() {
    return path.resolve(this.relativePagesDirectory());
  }

  absoluteOutputPath(parts = []) {
    return path.resolve(this.config.output_path, ...parts);
  }

  async compileFile(id, content, generateTypes = true) {
    const filter = createFilter("**/*.vue");

    if (!filter(id) || !id.startsWith(this.absolutePagesDirectory())) {
      return content;
    }

    try {
      const { stdout } = await execAsync(
        `php artisan viper:compile --filename="${id}" --transform=${generateTypes ? "true" : "false"}`,
      );
      if (stdout) {
        console.log(stdout.toString());
      }
    } catch (error) {
      if (error instanceof Error && "stderr" in error) {
        const parsed = JSON.parse(error?.stderr?.toString?.() || "{}");
        this.devServer?.ws.send({
          type: "error",
          err: {
            message: parsed.message,
            stack: content,
            id,
          },
        });
      }
    }

    return content.replace(PHP_REGEX, "");
  }

  generate() {
    console.log(execSync("php artisan viper:generate").toString());
  }
}
