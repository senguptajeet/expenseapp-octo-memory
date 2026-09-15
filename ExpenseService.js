/**
 * Expense Management & Data Operations
 */

function saveExpenseData(requestingUser, formDataArray) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    const sessionData = verifySession(requestingUser); 
    const loggedInUser = sessionData.username;
    const isSuperAdmin = sessionData.isSuperAdmin;
    const explicitTeam = sessionData.explicitTeam;

    if (!formDataArray || formDataArray.length === 0) throw new Error("No data received for submission.");

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    
    const defaultHeaders = [
        'Timestamp', 'Name', 'Travel Day', 'Customer Name', 'Starting Point', 'Ending Point', 
        'Mode of Travel', 'LOCATION', 'Travel Cost', 'Fooding Cost', 'Other Expense', 
        'Equipment Transport', 'Material Purchase', 'GST Amount', 'Remarks', 'Bike KM', 
        'Remarks for Other Expense', 'Calculated Bike Cost', 'Uploaded File'
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(defaultHeaders);
      sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight('bold').setBackground('#f3f4f6');
      sheet.setFrozenRows(1);
    }

    const headerMap = getHeaderMap(sheet);
    const mapDef = getMapDef(headerMap);
    const lastCol = Math.max(sheet.getLastColumn(), 20);

    const timestamp = new Date();
    const rowsToInsert = [];
    let uploadFolder = null; 

    for (let i = 0; i < formDataArray.length; i++) {
      const row = formDataArray[i];
      let recordName = row.name;
      
      if (!isSuperAdmin) {
        const safeRecordName = recordName ? String(recordName).toLowerCase() : "";
        const isManaged = explicitTeam.some(member => member && String(member).toLowerCase() === safeRecordName);
        if (!isManaged) recordName = loggedInUser; 
      }

      if (!recordName || !row.travelDay || !row.location || !row.customerName) {
          throw new Error(`Mandatory fields (including Customer Name) are missing.`);
      }
      
      const otherExpense = Number(row.otherExpense) || 0;
      const gstValue = Number(row.gstValue) || 0;

      if (otherExpense > 0 && !row.remarksOther) throw new Error(`Remarks required for Other Expense.`);

      const rowTotalExpense = (Number(row.travelCost) || 0) + (Number(row.foodingCost) || 0) + otherExpense + 
                              (Number(row.equipmentTransport) || 0) + (Number(row.materialPurchase) || 0) + 
                              (Number(row.vehicleCalcCost) || 0) + gstValue;
      
      if (rowTotalExpense <= 0) throw new Error(`Expense values cannot be entirely zero. Data rejected.`);

      let documentUrl = "";
      if (row.document && row.document.data) {
        if (!uploadFolder) uploadFolder = getOrCreateFolder(SCREENSHOT_FOLDER_NAME);
        try {
          const blob = Utilities.newBlob(Utilities.base64Decode(row.document.data), row.document.mimeType, `${recordName}_${row.travelDay}_${row.document.filename}`);
          const file = uploadFolder.createFile(blob);
          documentUrl = file.getUrl();
        } catch (e) { console.error("File upload failed: " + e.message); }
      }

      if (gstValue > 0 && !documentUrl) {
          throw new Error(`Document upload is strictly mandatory when GST Value is greater than 0.`);
      }

      const docFormula = documentUrl ? `=HYPERLINK("${documentUrl}", "open File")` : "";

      const newRow = new Array(lastCol).fill("");
      
      newRow[mapDef.timestamp] = timestamp;
      newRow[mapDef.name] = recordName;
      newRow[mapDef.travelDay] = row.travelDay;
      newRow[mapDef.customer] = row.customerName || "";
      newRow[mapDef.start] = row.startingPoint || "";
      newRow[mapDef.end] = row.endingPoint || "";
      newRow[mapDef.mode] = row.modeOfTravel || "";
      newRow[mapDef.location] = row.location;
      newRow[mapDef.travelCost] = Number(row.travelCost) || 0;
      newRow[mapDef.foodingCost] = Number(row.foodingCost) || 0;
      newRow[mapDef.otherExp] = otherExpense;
      newRow[mapDef.equip] = Number(row.equipmentTransport) || 0;
      newRow[mapDef.material] = Number(row.materialPurchase) || 0;
      newRow[mapDef.gst] = gstValue;                                    
      newRow[mapDef.remarks] = row.remarks || "";                       
      newRow[mapDef.vehicleKm] = Number(row.vehicleKm) || 0;            
      newRow[mapDef.remarksOther] = otherExpense > 0 ? row.remarksOther : ""; 
      newRow[mapDef.vehicleCost] = Number(row.vehicleCalcCost) || 0;    
      newRow[mapDef.doc] = docFormula;                                  

      rowsToInsert.push(newRow);
    }
    
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToInsert.length, lastCol).setValues(rowsToInsert);
    
    if (mapDef.timestamp !== -1) {
        sheet.getRange(startRow, mapDef.timestamp + 1, rowsToInsert.length, 1).setNumberFormat("dd-MM-yyyy HH:mm:ss");
    }

    return { success: true, message: `${rowsToInsert.length} expense record(s) submitted successfully.` };
  } catch (error) { return { success: false, message: error.toString() }; } finally { lock.releaseLock(); }
}

function fetchExpenseReport(requestingUser, fromDateStr, toDateStr, employeeFilter) {
  try {
    const sessionData = verifySession(requestingUser);
    const loggedInUser = sessionData.username;
    const isSuperAdmin = sessionData.isSuperAdmin;
    const explicitTeam = sessionData.explicitTeam;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { success: true, data: [], totals: getEmptyTotals(), insight: null }; 

    const data = sheet.getDataRange().getValues();
    const formulas = sheet.getDataRange().getFormulas();
    if (data.length <= 1) return { success: true, data: [], totals: getEmptyTotals(), insight: null }; 

    const headerMap = getHeaderMap(sheet);
    const mapDef = getMapDef(headerMap);

    const tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();

    const formattedRecords = [];
    let displayIndex = 1;
    let totals = getEmptyTotals();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const empName = row[mapDef.name] ? row[mapDef.name].toString().trim() : '';
      const travelDayRaw = row[mapDef.travelDay];
      
      if (!travelDayRaw) continue;
      
      let hasAccess = false;
      const cleanEmpName = empName.toLowerCase();
      const cleanLoggedInUser = loggedInUser.toLowerCase().trim();

      if (isSuperAdmin) {
          hasAccess = true;
      } else if (cleanEmpName === cleanLoggedInUser) {
          hasAccess = true;
      } else if (explicitTeam.some(member => member && String(member).toLowerCase().trim() === cleanEmpName)) {
          hasAccess = true;
      }

      if (!hasAccess) continue;
      if (employeeFilter && employeeFilter !== "All Employees" && cleanEmpName !== employeeFilter.toLowerCase().trim()) continue;

      let tdValStr = "";
      if (travelDayRaw instanceof Date) {
          tdValStr = Utilities.formatDate(travelDayRaw, tz, "yyyy-MM-dd");
      } else {
          let str = String(travelDayRaw).trim();
          let isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
              tdValStr = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
          } else {
              let parsed = new Date(str);
              if (!isNaN(parsed.getTime())) {
                  tdValStr = Utilities.formatDate(parsed, tz, "yyyy-MM-dd");
              } else {
                  tdValStr = str;
              }
          }
      }

      if (tdValStr < fromDateStr || tdValStr > toDateStr) continue;

      totals.travel += Number(row[mapDef.travelCost]) || 0;
      totals.food += Number(row[mapDef.foodingCost]) || 0;
      totals.other += Number(row[mapDef.otherExp]) || 0;
      totals.equip += Number(row[mapDef.equip]) || 0;
      totals.material += Number(row[mapDef.material]) || 0;
      totals.gst += Number(row[mapDef.gst]) || 0;

      let tVal = row[mapDef.timestamp] || "";
      if (tVal) {
          if (tVal instanceof Date) tVal = Utilities.formatDate(tVal, tz, "dd-MM-yyyy HH:mm:ss");
          else {
              let parsed = new Date(tVal);
              if (!isNaN(parsed.getTime())) tVal = Utilities.formatDate(parsed, tz, "dd-MM-yyyy HH:mm:ss");
          }
      }

      const serializedRow = [
       tVal,
       row[mapDef.name] || "",
       tdValStr, 
       row[mapDef.customer] || "",
       row[mapDef.start] || "",
       row[mapDef.end] || "",
       row[mapDef.mode] || "",
       row[mapDef.location] || "",
       row[mapDef.travelCost] || 0,
       row[mapDef.foodingCost] || 0,
       row[mapDef.otherExp] || 0,
       row[mapDef.equip] || 0,
       row[mapDef.material] || 0,
       row[mapDef.remarks] || "",
       row[mapDef.remarksOther] || "",
       row[mapDef.vehicleKm] || 0,
       row[mapDef.vehicleCost] || 0,
       "", 
       row[mapDef.gst] || 0
      ];

      const formula = formulas[i][mapDef.doc];
      if (formula && formula.toUpperCase().includes('HYPERLINK')) {
          const match = formula.match(/HYPERLINK\("([^"]+)"/);
          if (match) serializedRow[17] = match[1]; 
      } else {
          serializedRow[17] = row[mapDef.doc];
      }

      formattedRecords.push([displayIndex++, ...serializedRow, i + 1]);
    }

    totals.grandTotal = totals.travel + totals.food + totals.other + totals.equip + totals.material + totals.gst;
    const dayDiff = Math.max(1, Math.ceil((new Date(toDateStr + "T00:00:00Z") - new Date(fromDateStr + "T00:00:00Z")) / (1000 * 60 * 60 * 24)));
    const aiInsight = generateSmartInsightServer(totals, dayDiff);

    return { success: true, data: formattedRecords, totals: totals, insight: aiInsight };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function updateExpenseRecord(requestingUser, sheetRowIndex, updatedData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sessionData = verifySession(requestingUser);
    if (!sessionData.isSuperAdmin) throw new Error("Access Denied.");
    if(sheetRowIndex <= 1) throw new Error("Invalid row selected.");
    if (!updatedData.customerName) throw new Error("Customer Name is mandatory.");
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const headerMap = getHeaderMap(sheet);
    const mapDef = getMapDef(headerMap);
    
    let finalDocUrl = updatedData.existingDocUrl || "";
    if (updatedData.newDocument && updatedData.newDocument.data) {
        const folder = getOrCreateFolder(SCREENSHOT_FOLDER_NAME);
        const blob = Utilities.newBlob(Utilities.base64Decode(updatedData.newDocument.data), updatedData.newDocument.mimeType, updatedData.newDocument.filename);
        const file = folder.createFile(blob);
        finalDocUrl = file.getUrl();
    }

    const gstValue = Number(updatedData.gstValue) || 0;
    if (gstValue > 0 && !finalDocUrl) {
        throw new Error("Document upload is mandatory when GST Value is greater than 0.");
    }

    const docFormula = finalDocUrl ? `=HYPERLINK("${finalDocUrl}", "open File")` : "";

    const lastCol = Math.max(sheet.getLastColumn(), 20);
    const rowRange = sheet.getRange(sheetRowIndex, 1, 1, lastCol);
    const currentRowValues = rowRange.getValues()[0];
    
    currentRowValues[mapDef.name] = updatedData.name;
    currentRowValues[mapDef.travelDay] = updatedData.travelDay;
    currentRowValues[mapDef.customer] = updatedData.customerName;
    currentRowValues[mapDef.start] = updatedData.startingPoint || "";
    currentRowValues[mapDef.end] = updatedData.endingPoint || "";
    currentRowValues[mapDef.mode] = updatedData.modeOfTravel || "";
    currentRowValues[mapDef.location] = updatedData.location;
    currentRowValues[mapDef.travelCost] = Number(updatedData.travelCost) || 0;
    currentRowValues[mapDef.foodingCost] = Number(updatedData.foodingCost) || 0;
    currentRowValues[mapDef.otherExp] = Number(updatedData.otherExpense) || 0;
    currentRowValues[mapDef.equip] = Number(updatedData.equipmentTransport) || 0;
    currentRowValues[mapDef.material] = Number(updatedData.materialPurchase) || 0;
    
    currentRowValues[mapDef.gst] = gstValue;
    currentRowValues[mapDef.remarks] = updatedData.remarks || "";
    currentRowValues[mapDef.vehicleKm] = Number(updatedData.vehicleKm) || 0;
    currentRowValues[mapDef.remarksOther] = (Number(updatedData.otherExpense) > 0) ? updatedData.remarksOther : "";
    currentRowValues[mapDef.vehicleCost] = Number(updatedData.vehicleCalcCost) || 0;
    currentRowValues[mapDef.doc] = docFormula;

    rowRange.setValues([currentRowValues]);
    return { success: true, message: "Record updated successfully." };
  } catch (error) { return { success: false, message: error.toString() }; } finally { lock.releaseLock(); }
}

function getEmptyTotals() {
  return { travel: 0, food: 0, other: 0, equip: 0, material: 0, gst: 0, grandTotal: 0 };
}