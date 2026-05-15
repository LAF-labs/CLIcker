import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

if (os.platform() === "darwin") {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const prebuildRoot = path.join(repoRoot, "node_modules", "node-pty", "prebuilds");

  for (const arch of ["arm64", "x64"]) {
    const helperPath = path.join(prebuildRoot, `darwin-${arch}`, "spawn-helper");
    if (!fs.existsSync(helperPath)) {
      continue;
    }

    const mode = fs.statSync(helperPath).mode;
    fs.chmodSync(helperPath, mode | 0o755);
  }
}
