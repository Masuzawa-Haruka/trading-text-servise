import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "next.cmd" : "next";
const args = process.argv.includes("--lan") ? ["dev", "-H", "0.0.0.0"] : ["dev"];
const child = spawn(command, args, {
  env: {
    ...process.env,
    NEXT_PUBLIC_AUTH_MOCK_ENABLED: "true",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
