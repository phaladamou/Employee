#!/usr/bin/env node
/**
 * local employee CLI
 *
 * Creator-facing CLI for interacting with an employee.
 * Usage: employee-cli <command> [args]
 */

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  switch (command) {
    case "status":
      await import("./commands/status.js");
      break;
    case "logs":
      await import("./commands/logs.js");
      break;
    case "fund":
      await import("./commands/fund.js");
      break;
    case "send":
      await import("./commands/send.js");
      break;
    default:
      console.log(`
local employee CLI - Creator Tools

Usage:
  employee-cli status              Show employee status
  employee-cli logs [--tail N]     View employee logs
  employee-cli fund <amount> [--to 0x...]  Transfer local credits
  employee-cli send <to-address> <message> Send a social message
`);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

