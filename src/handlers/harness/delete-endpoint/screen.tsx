import { Text, useInput } from "ink";
import { useNavigate } from "react-router";
import type { ScreenProps } from "../../types";
import { Layout } from "../../../components/Layout";

// HarnessDeleteEndpointScreen is a stub for deleting a harness endpoint. Esc
// pops back. TODO.
export function HarnessDeleteEndpointScreen(_props: ScreenProps) {
  const navigate = useNavigate();

  useInput((_input, key) => {
    if (key.escape) navigate(-1);
  });

  return (
    <Layout
      breadcrumb={["agentcore", "harness", "delete-endpoint"]}
      keyHints={[
        { key: "esc", label: "back" },
        { key: "ctl+c", label: "quit" },
      ]}
    >
      <Text>TODO</Text>
    </Layout>
  );
}
