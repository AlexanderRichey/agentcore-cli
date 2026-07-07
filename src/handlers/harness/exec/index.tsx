import z from "zod";
import { createHandler, flag } from "../../../router";
import type { Core } from "../../types.tsx";
import { coreOptsFromCtx } from "../../utils.tsx";
import { JsonRendererKey } from "../../../tui";
import { applyExecEvent, finishExec, newExecItem } from "../invoke/transcript.tsx";

export const createExecHarnessHandler = (core: Core) =>
  createHandler({
    name: "exec",
    description: "run a shell command in a harness",
    flags: [
      flag("id", "the ID of the harness", z.string().max(48).optional()),
      flag("command", "the shell command to run", z.string().optional()),
      flag(
        "session-id",
        "the runtime session ID to run in (33-100 characters)",
        z.string().min(33).max(100).optional(),
      ),
      flag("qualifier", "the harness endpoint qualifier", z.string().optional()),
      flag(
        "timeout",
        "seconds to wait for the command (1-3600)",
        z.number().min(1).max(3600).optional(),
      ),
    ],
    handle: async (ctx, flags) => {
      // Required at runtime but declared optional so that a bare `harness exec`
      // falls through to the TUI middleware instead.
      if (!flags["id"]) {
        throw new TypeError("required option '--id <id>' not specified");
      }
      if (!flags["command"]) {
        throw new TypeError("required option '--command <command>' not specified");
      }

      const opts = coreOptsFromCtx(ctx);
      const detail = await core.harness.getHarness(flags["id"], opts);

      const response = await core.harness.invokeAgentRuntimeCommand(
        {
          // A harness-managed runtime cannot be addressed by its own runtime
          // ARN; the service expects the harness ARN here.
          agentRuntimeArn: detail.harness?.arn,
          qualifier: flags["qualifier"],
          runtimeSessionId: flags["session-id"],
          body: { command: flags["command"], timeout: flags["timeout"] },
        },
        opts,
      );

      const item = newExecItem(flags["command"]);
      for await (const event of response.stream ?? []) {
        applyExecEvent(item, event);
      }
      finishExec(item);

      ctx.require(JsonRendererKey).renderJson({
        sessionId: flags["session-id"] ?? response.runtimeSessionId,
        command: item.command,
        exitCode: item.exitCode,
        status: item.status,
        output: item.output,
      });
    },
  });

export { HarnessExecScreen } from "./screen.tsx";
