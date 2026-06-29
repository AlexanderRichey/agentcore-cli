export interface CoreHarnessClient {
  getHarness(region: string, id: string): any
  listHarnesses(region: string, nextToken?: string): any
}
