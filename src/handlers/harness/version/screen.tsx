import { RouterScreen } from "../../../components/RouterScreen";
import type { ScreenProps } from "../../types";

export function HarnessVersionScreen(props: ScreenProps) {
  return <RouterScreen {...props} path={["agentcore", "harness", "version"]} />;
}
