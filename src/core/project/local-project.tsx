import type { AddResourceInput, Project, RemoveResourceInput } from "../../handlers/project/types";
import type { EnvAccessor } from "../../env";
import { basename } from "path";

export interface LocalProjectConfig {
  env: EnvAccessor;
}

/** Local filesystem-backed project. */
export class LocalProject implements Project {
  constructor(
    readonly path: string,
    private readonly config: LocalProjectConfig,
  ) {}

  get name() {
    return basename(this.path);
  }

  async add(_input: AddResourceInput): Promise<void> {
    throw new Error("TODO: LocalProject.add");
  }

  async remove(_input: RemoveResourceInput): Promise<void> {
    throw new Error("TODO: LocalProject.remove");
  }
}
