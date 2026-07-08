import { RouterScreen } from "../../../components/RouterScreen";
import type { ScreenProps } from "../../types";

export function AddScreen(props: ScreenProps) {
  return <RouterScreen {...props} path={["agentcore", "project", "add"]} />;
}
