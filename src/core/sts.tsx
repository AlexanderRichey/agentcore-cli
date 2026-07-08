import { GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import type { CoreStsClient } from "../handlers/types";
import type { AwsClients } from "./types";

/** Implements {@link CoreStsClient} using the AWS STS SDK. */
export class StsClient implements CoreStsClient {
  constructor(private readonly clients: AwsClients) {}

  async getCallerIdentity(region: string): Promise<{ account?: string }> {
    const response = await this.clients.sts({ region }).send(new GetCallerIdentityCommand({}));
    return { account: response.Account };
  }
}
