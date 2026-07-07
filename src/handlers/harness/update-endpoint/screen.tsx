import { Text } from "ink";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import type { ScreenProps } from "../../types";
import { coreOptsFromCtx } from "../../utils";
import { HarnessPicker } from "../../../components/HarnessPicker";
import { EndpointPicker } from "../../../components/EndpointPicker";
import { EndpointWizard } from "../../../components/EndpointWizard";
import { Layout } from "../../../components/Layout";
import { Spinner } from "../../../components/ui/spinner";

// HarnessUpdateEndpointScreen is the interactive update-endpoint flow: pick the
// harness, pick the endpoint, then run the endpoint wizard prefilled with the
// endpoint's current target version and description, ending in an
// UpdateHarnessEndpoint call.
export function HarnessUpdateEndpointScreen(props: ScreenProps) {
  const navigate = useNavigate();
  const { harnessId, endpointName } = useParams();

  if (!harnessId) {
    return (
      <HarnessPicker
        {...props}
        breadcrumb={["agentcore", "harness", "update-endpoint"]}
        description="choose the harness the endpoint belongs to"
        onSelect={(id) => navigate(`/agentcore/harness/update-endpoint/${id}`)}
      />
    );
  }
  if (!endpointName) {
    return (
      <EndpointPicker
        {...props}
        harnessId={harnessId}
        breadcrumb={["agentcore", "harness", "update-endpoint", harnessId]}
        description="choose an endpoint to update"
        onSelect={(name) => navigate(`/agentcore/harness/update-endpoint/${harnessId}/${name}`)}
      />
    );
  }
  return <UpdateWizard {...props} harnessId={harnessId} endpointName={endpointName} />;
}

function UpdateWizard({
  ctx,
  core,
  harnessId,
  endpointName,
}: ScreenProps & { harnessId: string; endpointName: string }) {
  const opts = coreOptsFromCtx(ctx);
  const navigate = useNavigate();

  // The wizard seeds its form state once on mount, so it renders only after the
  // endpoint's current settings have arrived.
  const detail = useQuery({
    queryKey: ["harness-endpoint", opts.region, harnessId, endpointName],
    queryFn: () => core.harness.getHarnessEndpoint(harnessId, endpointName, opts),
  });

  if (detail.isPending || detail.isError) {
    return (
      <Layout
        breadcrumb={["agentcore", "harness", "update-endpoint", harnessId, endpointName]}
        keyHints={[
          { key: "esc", label: "back" },
          { key: "ctl+c", label: "quit" },
        ]}
      >
        {detail.isPending ? (
          <Spinner label="Loading endpoint…" />
        ) : (
          <Text color="red">Error: {(detail.error as Error).message}</Text>
        )}
      </Layout>
    );
  }

  const endpoint = detail.data.endpoint;
  return (
    <EndpointWizard
      ctx={ctx}
      core={core}
      mode="update"
      harnessId={harnessId}
      endpointName={endpointName}
      breadcrumb={["agentcore", "harness", "update-endpoint", harnessId, endpointName]}
      initial={{
        name: endpointName,
        // A settled endpoint reports only liveVersion (targetVersion clears
        // once the transition finishes), so fall back to what's serving.
        version: endpoint?.targetVersion ?? endpoint?.liveVersion ?? "",
        description: endpoint?.description ?? "",
      }}
      onDone={(name) => navigate(`/agentcore/harness/get-endpoint/${harnessId}/${name}`)}
    />
  );
}
