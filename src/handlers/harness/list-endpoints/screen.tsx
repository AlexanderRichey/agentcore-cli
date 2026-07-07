import { Text, useInput } from "ink";
import { useNavigate } from "react-router";
import type { ScreenProps } from "../../types";
import { Layout } from "../../../components/Layout";

// HarnessListEndpointsScreen is a stub for listing a harness's endpoints. Esc
// pops back. TODO.
export function HarnessListEndpointsScreen(_props: ScreenProps) {
  const navigate = useNavigate();

  useInput((_input, key) => {
    if (key.escape) navigate(-1);
  });

  return (
    <Layout
      breadcrumb={["agentcore", "harness", "list-endpoints"]}
      keyHints={[
        { key: "esc", label: "back" },
        { key: "ctl+c", label: "quit" },
      ]}
    >
      <Text>TODO</Text>
    </Layout>
  );
}
