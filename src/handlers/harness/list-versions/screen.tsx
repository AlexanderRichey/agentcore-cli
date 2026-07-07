import { useNavigate, useParams } from "react-router";
import type { ScreenProps } from "../../types";
import { HarnessPicker } from "../../../components/HarnessPicker";
import { VersionPicker } from "../../../components/VersionPicker";

// HarnessListVersionsScreen lists a harness's versions. Without a `:harnessId`
// route value it renders a harness picker first; with one it lists that
// harness's versions, and selecting a version opens its JSON detail.
export function HarnessListVersionsScreen(props: ScreenProps) {
  const navigate = useNavigate();
  const { harnessId } = useParams();

  if (!harnessId) {
    return (
      <HarnessPicker
        {...props}
        breadcrumb={["agentcore", "harness", "list-versions"]}
        description="choose a harness to list versions for"
        onSelect={(id) => navigate(`/agentcore/harness/list-versions/${id}`)}
      />
    );
  }

  return (
    <VersionPicker
      {...props}
      harnessId={harnessId}
      breadcrumb={["agentcore", "harness", "list-versions", harnessId]}
      onSelect={(version) => navigate(`/agentcore/harness/get-version/${harnessId}/${version}`)}
    />
  );
}
