import { Text, useInput } from "ink";
import { useNavigate } from "react-router";
import type { ScreenProps } from "../../types";
import { Layout } from "../../../components/Layout";

// HarnessGetVersionScreen is a stub for getting a specific harness version. Esc
// pops back. TODO.
export function HarnessGetVersionScreen(_props: ScreenProps) {
  const navigate = useNavigate();

  useInput((_input, key) => {
    if (key.escape) navigate(-1);
  });

  return (
    <Layout
      breadcrumb={["agentcore", "harness", "get-version"]}
      keyHints={[
        { key: "esc", label: "back" },
        { key: "ctl+c", label: "quit" },
      ]}
    >
      <Text>TODO</Text>
    </Layout>
  );
}
