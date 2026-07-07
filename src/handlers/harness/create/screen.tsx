import { useNavigate } from "react-router";
import type { ScreenProps } from "../../types";
import { HarnessWizard } from "../../../components/HarnessWizard";

// HarnessCreateScreen is the interactive create-harness flow: a step wizard
// (name → memory → tools → prompt → advanced → review) that ends in a
// CreateHarness call. Success lands on the new harness's hub.
export function HarnessCreateScreen(props: ScreenProps) {
  const navigate = useNavigate();

  return (
    <HarnessWizard
      {...props}
      mode="create"
      breadcrumb={["agentcore", "harness", "create"]}
      onDone={(harnessId) => navigate(`/agentcore/harness/get/${harnessId}`)}
    />
  );
}
