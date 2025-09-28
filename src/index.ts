import "dotenv/config";
import { parseConfigFromFile } from "./config";
import { Runner } from "./runner";

async function main() {
  // TODO: specify config location, also better config validation and errors
  const config = await parseConfigFromFile("./config.json");

  const runner = new Runner(config);
  await runner.init();

  try {
    await runner.runRepeatedly(10 * 60 * 1000); // every 10 mins. TODO: configurable
  } finally {
    await config.destination.shutdown();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
