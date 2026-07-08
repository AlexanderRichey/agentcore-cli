import type { CreateProjectInput, Project, ProjectAccessor } from "../../handlers/project/types";
import type { EnvAccessor } from "../../env";
import { join, resolve } from "path";
import { LocalProject } from "./local-project";
import { type IaCProviderType } from "./types";

export interface LocalProjectAccessorConfig {
  env: EnvAccessor;
}

// TODO: derive this from project schemas
interface AgentCoreConfig {
  $schema: string;
  name: string;
  version: number;
  managedBy: IaCProviderType;
  tags: Record<string, string>;
}

/** Resolves projects from the local filesystem. */
export class LocalProjectAccessor implements ProjectAccessor {
  constructor(private readonly config: LocalProjectAccessorConfig) {}

  private getDefaultAgentCoreConfig(
    projectName: string,
    managedBy: IaCProviderType = "CDK",
  ): AgentCoreConfig {
    return {
      $schema: "https://schema.agentcore.aws.dev/v1/agentcore.json",
      name: projectName,
      version: 1,
      managedBy: managedBy,
      tags: {
        "agentcore:created-by": "agentcore-cli",
        "agentcore:project-name": projectName,
      },
    };
  }

  private getDefaultAWSTargets(region: string, account?: string) {
    if (!account) return [];
    return [
      {
        name: "default",
        account,
        region,
        description: "Default target",
      },
    ];
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const outputDir = input.path ?? resolve(input.projectName);

    if (await this.find(outputDir)) {
      throw new Error(`project with that name already exists at '${outputDir}'`);
    }

    const rootDir = await this.config.env.fs.mkdir(outputDir);

    try {
      const agentcoreDir = await this.config.env.fs.mkdir(join(rootDir, "agentcore"));

      await this.config.env.fs.writeFile(
        join(agentcoreDir, "agentcore.json"),
        JSON.stringify(this.getDefaultAgentCoreConfig(input.projectName)),
      );
      await this.config.env.fs.writeFile(
        join(agentcoreDir, "aws-targets.json"),
        JSON.stringify(this.getDefaultAWSTargets(input.region, input.account)),
      );
      // TODO: scaffold rest of project: init git, add readme, etc.;

      return new LocalProject(rootDir, { env: this.config.env });
    } catch (error) {
      // Clean up partially constructed project
      await this.config.env.fs.rm(rootDir, { recursive: true });
      throw error;
    }
  }

  private async isProjectDir(path: string): Promise<boolean> {
    return this.config.env.fs.exists(join(path, "agentcore", "agentcore.json"));
  }

  async find(path?: string): Promise<Project | undefined> {
    const projectPath = path ?? this.config.env.getCurrentDirectory();

    if (await this.isProjectDir(projectPath)) {
      // TODO: read project files to determine what provider, config accessor we want to inject.
      return new LocalProject(projectPath, { env: this.config.env });
    }

    return undefined;
  }
}
