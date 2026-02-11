import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI_PATH = fileURLToPath(new URL("./cli.js", import.meta.url));
const ARGS = process.argv.slice(2);

const result = spawnSync("bun", [CLI_PATH, ...ARGS], { stdio: "inherit" });

if (result.error) {
  process.stderr.write(
    "Error: Bun is required to run toadstool (OpenTUI depends on Bun).\n" +
      "Install Bun from https://bun.sh and ensure `bun` is on your PATH.\n"
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
