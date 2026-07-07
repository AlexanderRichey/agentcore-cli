import { RouterScreen } from "../../../components/RouterScreen";
import type { ScreenProps } from "../../types";

export function HarnessEndpointScreen(props: ScreenProps) {
  return <RouterScreen {...props} path={["agentcore", "harness", "endpoint"]} />;
}
