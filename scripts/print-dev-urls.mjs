#!/usr/bin/env node
/**
 * Prints redirect URL lines for Supabase and open-in-browser URLs for LAN testing.
 * Run: npm run dev:urls
 */
import os from "node:os";

const port = process.env.PORT || "3000";
const ips = [];

for (const list of Object.values(os.networkInterfaces())) {
  if (!list) continue;
  for (const net of list) {
    const fam = net.family;
    const isV4 =
      fam === "IPv4" || fam === 4 || `${fam}`.includes("4");
    if (!isV4 || net.internal) continue;
    ips.push(net.address);
  }
}

console.log("\n── Supabase → Authentication → URL configuration → Redirect URLs ──\n");
console.log(`http://localhost:${port}/**`);
console.log(`http://127.0.0.1:${port}/**`);
for (const ip of ips) {
  console.log(`http://${ip}:${port}/**`);
}

console.log("\n── Open on another device on the same Wi-Fi (run npm run dev first) ──\n");
if (ips.length === 0) {
  console.log("  (no non-loopback IPv4 found — connect to Wi‑Fi or VPN)\n");
} else {
  for (const ip of ips) console.log(`  http://${ip}:${port}`);
}

console.log(
  "\nIn dev this app sends magic-link redirects using the browser’s URL (localhost vs LAN).\nPaste the Redirect URL lines above so Supabase accepts them.\n",
);
