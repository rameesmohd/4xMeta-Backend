const cron = require("node-cron");
const { generateActivityEvents } = require("../utils/generateactivityevents");

cron.schedule("*/5 * * * 1-5", async () => {
  await generateActivityEvents(1);
});

cron.schedule("5 22 * * 0", async () => {
  console.log("[cron] weekly market open — seeding activity feed");
  await generateActivityEvents(6);
});

console.log("[cron] activity event jobs registered");