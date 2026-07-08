import type { FilesystemAccessor } from "./types";
import { access, mkdir, rm, writeFile } from "fs/promises";

/** Returns a {@link FilesystemAccessor} backed by `fs/promises`. */
export function getDefaultFs(): FilesystemAccessor {
  return {
    exists: async (path: string) => {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    },
    mkdir: async (path, options?) => {
      await mkdir(path, options);
      return path;
    },
    rm: async (path, options?) => {
      await rm(path, options);
    },
    writeFile: async (path, data) => {
      await writeFile(path, data);
    },
  };
}
