import { useNavigate, useParams } from "react-router";
import type { ScreenProps } from "../../types";
import { HarnessPicker } from "../../../components/HarnessPicker";
import { HarnessChat } from "../invoke/screen";

// HarnessExecScreen is `harness exec` in the TUI: the same chat screen as
// invoke, but starting in exec mode ($ prompt, enter runs a shell command in
// the session's container). Ctrl+E flips between exec and chat at any time.
// Without a `:harnessId` route value it renders the harness picker.
export function HarnessExecScreen(props: ScreenProps) {
  const { harnessId } = useParams();
  const navigate = useNavigate();

  if (!harnessId) {
    return (
      <HarnessPicker
        {...props}
        breadcrumb={["agentcore", "harness", "exec"]}
        description="choose a harness to exec into"
        onSelect={(id) => navigate(`/agentcore/harness/exec/${id}`)}
      />
    );
  }
  return <HarnessChat {...props} harnessId={harnessId} variant="exec" />;
}
