import { useNavigate, useParams } from "react-router";
import type { ScreenProps } from "../../types";
import { HarnessPicker } from "../../../components/HarnessPicker";
import { EndpointWizard } from "../../../components/EndpointWizard";

// HarnessCreateEndpointScreen is the interactive create-endpoint flow. Without
// a `:harnessId` route value it renders a harness picker; with one it runs the
// endpoint wizard (name → version → description → review) ending in a
// CreateHarnessEndpoint call. Success lands on the endpoint's detail.
export function HarnessCreateEndpointScreen(props: ScreenProps) {
  const navigate = useNavigate();
  const { harnessId } = useParams();

  if (!harnessId) {
    return (
      <HarnessPicker
        {...props}
        breadcrumb={["agentcore", "harness", "create-endpoint"]}
        description="choose a harness to create an endpoint for"
        onSelect={(id) => navigate(`/agentcore/harness/create-endpoint/${id}`)}
      />
    );
  }

  return (
    <EndpointWizard
      {...props}
      mode="create"
      harnessId={harnessId}
      breadcrumb={["agentcore", "harness", "create-endpoint", harnessId]}
      onDone={(endpointName) =>
        navigate(`/agentcore/harness/get-endpoint/${harnessId}/${endpointName}`)
      }
    />
  );
}
