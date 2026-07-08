import { RouterScreen } from "../../../components/RouterScreen";
import type { ScreenProps } from "../../types";

export function RemoveScreen(props: ScreenProps) {
  return <RouterScreen {...props} path={["agentcore", "project", "remove"]} />;
}
