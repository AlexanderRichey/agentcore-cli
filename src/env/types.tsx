/** Top-level environment accessor — filesystem and process. */
export interface EnvAccessor {
  fs: FilesystemAccessor;
  getCurrentDirectory(): string;
}

/** Filesystem operations. */
export interface FilesystemAccessor {
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<string>;
  rm(path: string, options?: { recursive?: boolean }): Promise<void>;
  writeFile(path: string, data: string): Promise<void>;
}
