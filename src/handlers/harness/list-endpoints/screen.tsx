import { useNavigate, useParams } from "react-router";
import type { ScreenProps } from "../../types";
import { HarnessPicker } from "../../../components/HarnessPicker";
import { EndpointPicker } from "../../../components/EndpointPicker";

// HarnessListEndpointsScreen lists a harness's endpoints. Without a `:harnessId`
// route value it renders a harness picker first; with one it lists that
// harness's endpoints, and selecting an endpoint opens its JSON detail.
export function HarnessListEndpointsScreen(props: ScreenProps) {
  const navigate = useNavigate();
  const { harnessId } = useParams();

  if (!harnessId) {
    return (
      <HarnessPicker
        {...props}
        breadcrumb={["agentcore", "harness", "list-endpoints"]}
        description="choose a harness to list endpoints for"
        onSelect={(id) => navigate(`/agentcore/harness/list-endpoints/${id}`)}
      />
    );
  }

  return (
    <EndpointPicker
      {...props}
      harnessId={harnessId}
      breadcrumb={["agentcore", "harness", "list-endpoints", harnessId]}
      onSelect={(endpointName) =>
        navigate(`/agentcore/harness/get-endpoint/${harnessId}/${endpointName}`)
      }
    />
  );
}
