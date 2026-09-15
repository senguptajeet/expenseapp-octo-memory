/**
 * High-Speed Caching Engine & Data Retrieval
 */

function getAuthRegistryData() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('auth_registry');
  if (cached) return JSON.parse(cached);

  const ss = SpreadsheetApp.openById(AUTH_WORKBOOK_ID);
  const sheet = ss.getSheetByName(AUTH_SHEET_NAME) || ss.getSheetByName('Sheet2');
  if (!sheet) throw new Error("Authorization registry not found in secure workbook.");

  const data = sheet.getDataRange().getValues();
  cache.put('auth_registry', JSON.stringify(data), 21600); // Cache for 6 hours
  return data;
}

function clearAuthCache() {
  CacheService.getScriptCache().remove('auth_registry');
}

function getCachedDropdownData() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('target_dropdowns');
  if (cached) return JSON.parse(cached);

  const ss = SpreadsheetApp.openById(TARGET_WORKBOOK_ID);
  const sheet = ss.getSheetByName(DROPDOWN_SHEET_NAME) || ss.getSheetByName('Sheet 2');
  if (!sheet) throw new Error(`Sheet not found.`);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { locations: [], remarksOther: [] };

  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  let remarksOtherList = [];
  let locationsList = [];

  for (let i = 0; i < data.length; i++) {
    const remark = data[i][0] ? data[i][0].toString().trim() : '';
    const loc = data[i][1] ? data[i][1].toString().trim() : '';
    if (remark !== '') remarksOtherList.push(remark);
    if (loc !== '') locationsList.push(loc);
  }
  
  const result = { remarksOther: [...new Set(remarksOtherList)], locations: [...new Set(locationsList)] };
  cache.put('target_dropdowns', JSON.stringify(result), 1800); // Cache for 30 minutes
  return result;
}

function getDropdownData() {
  try { 
    return getCachedDropdownData(); 
  } catch (error) { 
    return { locations: [], remarksOther: [], error: error.toString() }; 
  }
}