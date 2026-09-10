import { spawnSync } from "node:child_process";

console.log("=================================================");
console.log("AGRIFLOW FULL REGRESSION & VERIFICATION TEST SUITE");
console.log("=================================================\n");

const tests = [
  "tests/earnings.test.ts",
  "tests/mandis.test.ts",
  "tests/security-commerce.test.ts",
];

let allPassed = true;

for (const test of tests) {
  console.log(`[SUITE] Executing ${test}...`);
  const result = spawnSync("npx", ["tsx", test], {
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`❌ FAILED: ${test} (exit code ${result.status})`);
    allPassed = false;
  }
}

if (!allPassed) {
  console.error("\n❌ ONE OR MORE TEST SUITES FAILED.\n");
  process.exit(1);
} else {
  console.log("\n✅ ALL 3 TEST SUITES PASSED END-TO-END!\n");
}
