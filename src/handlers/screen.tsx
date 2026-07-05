import { Text, useApp } from "ink";
import { CommandKey, type Context } from "../router";
import { useEffect } from "react";

export function RootScreen() {
  return <Text>Root Screen</Text>;
}

export interface HelpScreenProps {
  ctx: Context;
}

export function HelpScreen({ ctx }: HelpScreenProps) {
  const { exit } = useApp();
  const c = ctx.require(CommandKey);
  const help = c.createHelp();
  const helpText = help.formatHelp(c, help);

  useEffect(exit);

  return <Text>{helpText}</Text>;
}
