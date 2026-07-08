/** The supported IaC backends for managing project infrastructure. */
export const IaCProviderType = {
  CDK: "CDK",
  // TODO: add Terraform support
} as const;

export type IaCProviderType = (typeof IaCProviderType)[keyof typeof IaCProviderType];
