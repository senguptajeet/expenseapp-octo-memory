/**
 * AI Integrations and Smart Insights
 */

function generateSmartInsightServer(totals, daysCount) {
  if (totals.grandTotal === 0) return { text: "No expenses recorded for this period." };

  const categories = [
    { name: 'Travel', val: totals.travel },
    { name: 'Food', val: totals.food },
    { name: 'Other', val: totals.other },
    { name: 'Equipment', val: totals.equip },
    { name: 'Materials', val: totals.material },
    { name: 'GST', val: totals.gst }
  ].sort((a, b) => b.val - a.val);

  const topCat = categories[0];
  const percent = ((topCat.val / totals.grandTotal) * 100).toFixed(1);
  const dailyAvg = totals.grandTotal / (daysCount || 1);

  let insight = `Your top spending category is <strong>${topCat.name}</strong> (${percent}%). `;
  if (percent > 60) insight += `⚠️ This category is heavily skewing your budget. `;
  
  insight += `Daily average burn rate: <strong>₹${Math.round(dailyAvg).toLocaleString('en-IN')}</strong>.`;

  return { text: insight, topCategory: topCat.name, dailyAvg };
}

function auditExpensesWithAI(requestingUser, fromDateStr, toDateStr, employeeFilter) {
  try {
    const reportRes = fetchExpenseReport(requestingUser, fromDateStr, toDateStr, employeeFilter);
    if (!reportRes.success || reportRes.data.length === 0) return { success: false, message: "No data available to audit." };

    const payloadForAI = reportRes.data.map(row => ({
      name: row[3], date: row[4], location: row[9],
      travelCost: row[10], foodCost: row[11], otherCost: row[12],
      gstValue: row[19], remarks: (row[15] + " " + row[16]).trim()
    }));

    const prompt = `You are an expert corporate financial auditor. Review the following JSON. Return a brief, strictly formatted professional HTML summary: Use <strong> for emphasis. Use <ul><li> format for specific anomalous entries. Add a short paragraph on overarching patterns. Keep it direct and under 250 words. Do not use Markdown backticks. Expense Data: ${JSON.stringify(payloadForAI)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    
    const response = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
    const jsonResponse = JSON.parse(response.getContentText());
    if (jsonResponse.error) throw new Error(jsonResponse.error.message);
    
    return { success: true, insight: jsonResponse.candidates[0].content.parts[0].text };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function predictCashFlow(requestingUser, fromDateStr, toDateStr, employeeFilter) {
  try {
    const reportRes = fetchExpenseReport(requestingUser, fromDateStr, toDateStr, employeeFilter);
    if (!reportRes.success || reportRes.data.length === 0) return { success: false, message: "Insufficient historical data for forecasting." };

    const totals = reportRes.totals;
    const dayDiff = Math.max(1, Math.ceil((new Date(toDateStr + "T00:00:00Z") - new Date(fromDateStr + "T00:00:00Z")) / (1000 * 60 * 60 * 24)));
    const dailyVelocity = totals.grandTotal / dayDiff;

    const prompt = `You are a corporate financial analyst. Based on a historical average daily expense burn rate of ₹${dailyVelocity.toFixed(2)} calculated over ${dayDiff} days, the projected 30-day cash flow requirement is ₹${(dailyVelocity * 30).toFixed(2)}. Breakdown: Travel: ₹${totals.travel}, Food: ₹${totals.food}, Other: ₹${totals.other}, Equip: ₹${totals.equip}, Material: ₹${totals.material}, GST: ₹${totals.gst}. Provide a brief (max 3 sentences) HTML formatted strategic forecast without markdown blocks.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }), muteHttpExceptions: true });
    const jsonResponse = JSON.parse(response.getContentText());
    if (jsonResponse.error) throw new Error(jsonResponse.error.message);
    
    return { success: true, insight: jsonResponse.candidates[0].content.parts[0].text };
  } catch (error) { return { success: false, message: error.toString() }; }
}