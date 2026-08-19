import { getAvailablePortals, validateActiveWorkspace } from "../workspaceUtils.ts";
import type { RoleCode } from "../../types/jwtAuthentication.ts";

// Simple test suite runner for verification
export function runWorkspaceUtilsTests() {
  console.log("=== RUNNING WORKSPACE UTILS TESTS ===");
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  };

  // Test 1: Single role ADMIN -> ALL 4 PORTALS
  const portalsAdmin = getAvailablePortals(["ADMIN" as RoleCode]);
  assert(
    portalsAdmin.length === 4 &&
      portalsAdmin.includes("MANAGEMENT") &&
      portalsAdmin.includes("TEACHER") &&
      portalsAdmin.includes("STUDENT") &&
      portalsAdmin.includes("SUPPORT"),
    "ADMIN role returns all portals including SUPPORT"
  );

  // Test 2: Single role HR -> MANAGEMENT
  const portalsHR = getAvailablePortals(["HR" as RoleCode]);
  assert(
    portalsHR.length === 1 && portalsHR[0] === "MANAGEMENT",
    "HR role returns MANAGEMENT portal"
  );

  // Test 3: SUPPORT -> SUPPORT
  const portalsSupport = getAvailablePortals(["SUPPORT" as RoleCode]);
  assert(
    portalsSupport.length === 1 && portalsSupport[0] === "SUPPORT",
    "SUPPORT role returns SUPPORT portal"
  );

  // Test 4: TEACHER & TA -> TEACHER
  const portalsTeacher = getAvailablePortals(["TEACHER" as RoleCode, "TA" as RoleCode]);
  assert(
    portalsTeacher.length === 1 && portalsTeacher[0] === "TEACHER",
    "TEACHER + TA roles return TEACHER portal"
  );

  // Test 5: Multi-role TEACHER + STUDENT -> TEACHER & STUDENT
  const portalsMulti = getAvailablePortals(["TEACHER" as RoleCode, "STUDENT" as RoleCode]);
  assert(
    portalsMulti.length === 2 && portalsMulti.includes("TEACHER") && portalsMulti.includes("STUDENT"),
    "TEACHER + STUDENT roles return 2 portals"
  );

  // Test 6: Empty roles -> 0 Portals
  const portalsEmpty = getAvailablePortals([]);
  assert(portalsEmpty.length === 0, "Empty roles return 0 portals");

  // Test 7: Validate valid workspace
  const validWs = validateActiveWorkspace("TEACHER", ["MANAGEMENT", "TEACHER"]);
  assert(validWs === "TEACHER", "Valid active workspace is preserved");

  // Test 8: Validate invalid/revoked workspace -> fallback to first available
  const revokedWs = validateActiveWorkspace("MANAGEMENT", ["STUDENT"]);
  assert(revokedWs === "STUDENT", "Revoked workspace falls back to first available portal");

  console.log(`=== TEST SUMMARY: ${passed} Passed, ${failed} Failed ===`);
  return failed === 0;
}
