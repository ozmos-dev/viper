import fs from "node:fs/promises";
import path from "node:path";

export function trimSlashes(str: string) {
  return str.replace(/^\/+|\/+$/g, "");
}

export async function readDir(dir: string): Promise<string[]> {
  const paths = [];
  const files = await fs.readdir(path.resolve(dir), {
    withFileTypes: true,
  });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      paths.push(...(await readDir(fullPath)));
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}
