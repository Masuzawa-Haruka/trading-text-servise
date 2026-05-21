import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "next.cmd" : "next";
const child = spawn(command, ["dev"], {
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
