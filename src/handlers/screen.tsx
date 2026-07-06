import { Text, useApp } from "ink";
import { CommandKey } from "../router";
import { useEffect } from "react";
import type { ScreenProps } from "./types";

export function RootScreen(_props: ScreenProps) {
  return <Text>Root Screen</Text>;
}

export function HelpScreen({ ctx }: ScreenProps) {
  const { exit } = useApp();
  const c = ctx.require(CommandKey);
  const help = c.createHelp();
  const helpText = help.formatHelp(c, help);

  useEffect(exit, []);

  return <Text>{helpText}</Text>;
}
