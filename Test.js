/**
 * Automated Test Suite for User Authorization & Deletion Functionality
 * Run `runDeletionTests` manually from the Apps Script IDE to execute the assertions.
 */

function runDeletionTests() {
  Logger.log("--- Starting Employee Deletion Lifecycle Tests ---");

  const testSuperAdmin = SUPER_ADMIN_USERNAMES[0]; // Authorized user explicitly declared in Config.js
  const testNormalUser = "TestingUser123";
  const testTargetUser = "TestTargetEmployeeForDeletion";

  const ss = SpreadsheetApp.openById(AUTH_WORKBOOK_ID);
  let sheet = ss.getSheetByName(AUTH_SHEET_NAME) || ss.getSheetByName('Sheet2');

  // SETUP: Append a dummy record for testing target
  sheet.appendRow([testTargetUser, "PassTest123", "test@testdomain.local"]);
  const injectedRowIndex = sheet.getLastRow();
  clearAuthCache();
  Logger.log(`Test user initialized successfully at row mapping: ${injectedRowIndex}`);

  // TEST 1: UNAUTHORIZED DELETION 
  Logger.log("Test Case: Executing Unauthorized User Deletion Request...");
  const unauthResult = deleteUser(testNormalUser, injectedRowIndex);
  
  if (unauthResult.success === true) {
     Logger.log("FAIL (CRITICAL): Unauthorized profile successfully initiated deletion without permissions.");
  } else {
     Logger.log("PASS: System securely blocked unauthorized profile request -> " + unauthResult.message);
  }

  // Security Integrity Check: Confirm data remains physically unchanged
  let integrityVal = sheet.getRange(injectedRowIndex, 1).getValue();
  if (integrityVal === testTargetUser) {
      Logger.log("PASS: Target database record maintained integrity post-unauthorized execution.");
  } else {
      Logger.log("FAIL (CRITICAL): Underlying record mutated unexpectedly.");
  }

  // TEST 2: INVALID ROW INDEX/EMPLOYEE TEST
  Logger.log("Test Case: Validating Error Handling for Non-Existent Employee Contexts...");
  const invalidResult = deleteUser(testSuperAdmin, -1);
  if (invalidResult.success === true) {
      Logger.log("FAIL: Invalid row index deletion bypassed validation.");
  } else {
      Logger.log("PASS: Invalid parameters rejected gracefully -> " + invalidResult.message);
  }

  // TEST 3: AUTHORIZED SUPER ADMIN DELETION TEST
  Logger.log("Test Case: Validating Authorized Super Admin Execution Flow...");
  const authResult = deleteUser(testSuperAdmin, injectedRowIndex);
  if (authResult.success === true) {
      Logger.log("PASS: Authorized Super Admin flow succeeded.");
  } else {
      Logger.log("FAIL: Authorized logic blocked by backend validation -> " + authResult.message);
  }

  // TEST 4: POST-EXECUTION DATABASE ASSERTION
  // Verify physical structural shift confirming true deletion in spreadsheet
  clearAuthCache();
  const stateMatrix = sheet.getDataRange().getValues();
  const targetResidual = stateMatrix.some(row => row[0] === testTargetUser);
  if (!targetResidual) {
      Logger.log("PASS: Target user completely removed from physical storage layout.");
  } else {
      Logger.log("FAIL: Target user profile still physically exists in backend sheet.");
  }

  Logger.log("--- Employee Deletion Tests Execution Completed ---");
}