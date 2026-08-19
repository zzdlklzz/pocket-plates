import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { prepareLocalSupabase } from "./local-supabase.mjs";

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a local browser-test port."));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

let localSupabase;

try {
  localSupabase = prepareLocalSupabase();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Local Supabase setup failed."}\n`);
  process.exit(1);
}

const e2ePort = String(await getAvailablePort());
const nextEnvironmentTypesPath = new URL("../next-env.d.ts", import.meta.url);
const originalNextEnvironmentTypes = readFileSync(nextEnvironmentTypesPath, "utf8");

const playwrightResult = spawnSync("npx", ["playwright", "test"], {
  env: {
    ...process.env,
    E2E_BASE_URL: `http://127.0.0.1:${e2ePort}`,
    E2E_LOCAL_SUPABASE: "1",
    E2E_PORT: e2ePort,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localSupabase.publishableKey,
    NEXT_PUBLIC_SUPABASE_URL: localSupabase.url
  },
  stdio: "inherit"
});

writeFileSync(nextEnvironmentTypesPath, originalNextEnvironmentTypes);
process.exit(playwrightResult.status ?? 1);
