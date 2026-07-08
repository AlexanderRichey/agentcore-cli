/** The kinds of AgentCore resources that can be added to a project. */
export const ResourceType = {
  Agent: "agent",
  Gateway: "gateway",
  Memory: "memory",
  Harness: "harness",
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

// TODO: make discriminated union based on resource type, backed by zod.
/** Input for adding a resource to a project. */
export interface AddResourceInput {
  resource: ResourceType;
  name: string;
}

/** Input for creating a new AgentCore project. */
export interface CreateProjectInput {
  projectName: string;
  /** Directory to create the project in. Defaults to `./<projectName>`. */
  path?: string;
  /** AWS region for the default deployment target. */
  region: string;
  /** AWS account ID for the default deployment target. */
  account?: string;
}

/** A project describes a collection of AgentCore resources managed by the CLI. */
export interface Project {
  readonly name: string;
  /** Adds a resource to the project. */
  add(input: AddResourceInput): Promise<void>;
  /** Removes a resource from the project. */
  remove(input: RemoveResourceInput): Promise<void>;
}

/** Input for removing a resource from a project. */
export interface RemoveResourceInput {
  resource: ResourceType;
  name: string;
}

/** Locates and creates projects on the filesystem. */
export interface ProjectAccessor {
  create(input: CreateProjectInput): Promise<Project>;
  find(): Promise<Project | undefined>;
}
