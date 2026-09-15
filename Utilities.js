/**
 * Common System Utilities & Helper Functions
 */

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function getHeaderMap(sheet) {
  const lastCol = sheet.getLastColumn() || 20;
  const headers = sheet.getRange(1, 1, 1, Math.max(lastCol, 20)).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    if (h) map[h.toString().toLowerCase().trim()] = i;
  });
  return map;
}

function getMapDef(headerMap) {
  const getC = (names) => {
     for(let n of names) {
         const key = n.toLowerCase().trim();
         if (headerMap[key] !== undefined) return headerMap[key];
     }
     return -1;
  };
  
  return {
     timestamp: getC(['timestamp', 'time stamp']) !== -1 ? getC(['timestamp', 'time stamp']) : 0,
     name: getC(['name', 'employee name']) !== -1 ? getC(['name', 'employee name']) : 1,
     travelDay: getC(['travel day', 'date']) !== -1 ? getC(['travel day', 'date']) : 2,
     customer: getC(['customer name', 'customer']) !== -1 ? getC(['customer name', 'customer']) : 3,
     start: getC(['starting point', 'start point']) !== -1 ? getC(['starting point', 'start point']) : 4,
     end: getC(['ending point', 'end point']) !== -1 ? getC(['ending point', 'end point']) : 5,
     mode: getC(['mode of travel', 'travel mode']) !== -1 ? getC(['mode of travel', 'travel mode']) : 6,
     location: getC(['location', 'city', 'location *']) !== -1 ? getC(['location', 'city', 'location *']) : 7,
     travelCost: getC(['travel cost']) !== -1 ? getC(['travel cost']) : 8,
     foodingCost: getC(['fooding cost', 'food cost']) !== -1 ? getC(['fooding cost', 'food cost']) : 9,
     otherExp: getC(['other expense', 'other cost']) !== -1 ? getC(['other expense', 'other cost']) : 10,
     equip: getC(['equipment transport', 'equipment trans.']) !== -1 ? getC(['equipment transport', 'equipment trans.']) : 11,
     material: getC(['material purchase', 'material purch.']) !== -1 ? getC(['material purchase', 'material purch.']) : 12,
     gst: getC(['gst amount', 'gst value', 'gst', 'tax']) !== -1 ? getC(['gst amount', 'gst value', 'gst', 'tax']) : 13,
     remarks: getC(['remarks', 'normal remarks']) !== -1 ? getC(['remarks', 'normal remarks']) : 14,
     vehicleKm: getC(['bike km', 'vehicle km', 'km']) !== -1 ? getC(['bike km', 'vehicle km', 'km']) : 15,
     remarksOther: getC(['remarks for other expense', 'remarks if other expense', 'remarks (other)']) !== -1 ? getC(['remarks for other expense', 'remarks if other expense', 'remarks (other)']) : 16,
     vehicleCost: getC(['calculated bike cost', 'calculated vehicle cost', 'calc. cost']) !== -1 ? getC(['calculated bike cost', 'calculated vehicle cost', 'calc. cost']) : 17,
     doc: getC(['uploaded file', 'document url', 'document', 'doc', 'file link']) !== -1 ? getC(['uploaded file', 'document url', 'document', 'doc', 'file link']) : 18
  };
}

function formatIsoToDisplayDate(isoString) {
    if (!isoString) return "";
    const parts = isoString.split('-');
    if (parts.length === 3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${parts[2]}-${months[parseInt(parts[1], 10) - 1]}-${parts[0]}`;
    }
    return isoString;
}