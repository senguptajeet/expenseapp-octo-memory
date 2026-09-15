/**
 * Authentication and User Management Services
 */

function verifySession(username) {
  if (!username) throw new Error("Unauthorized request. Session missing.");
  const data = getAuthRegistryData();
  
  for (let i = 1; i < data.length; i++) {
    const sheetUsername = data[i][0] ? data[i][0].toString().trim() : '';
    
    if (sheetUsername.toLowerCase() === username.toLowerCase().trim()) {
      const upperUsername = sheetUsername.toUpperCase();
      return {
        username: sheetUsername,
        isSuperAdmin: SUPER_ADMIN_USERNAMES.some(admin => admin.toLowerCase().trim() === sheetUsername.toLowerCase()),
        explicitTeam: USER_TEAM_SCOPES[upperUsername] || []
      };
    }
  }
  throw new Error("Invalid session. User not found in registry.");
}

function authenticateUser(username, password) {
  try {
    if(!username || !password) throw new Error("Credentials cannot be empty.");
    const data = getAuthRegistryData();
    for (let i = 1; i < data.length; i++) {
      const sheetUsername = data[i][0] ? data[i][0].toString().trim() : '';
      const sheetPassword = data[i][1] ? data[i][1].toString().trim() : '';

      if (sheetUsername.toLowerCase() === username.toLowerCase().trim() && sheetPassword === password.trim()) {
        const isSuper = SUPER_ADMIN_USERNAMES.some(admin => admin.toLowerCase().trim() === sheetUsername.toLowerCase());
        return { success: true, message: "Authentication successful.", username: sheetUsername, isAdmin: isSuper };
      }
    }
    return { success: false, message: "Invalid username or password." };
  } catch (error) { return { success: false, message: error.message }; }
}

function getEmployeeList(requestingUser) {
  try {
    const sessionData = verifySession(requestingUser);
    if (!sessionData.isSuperAdmin && sessionData.explicitTeam.length === 0) return []; 
    
    const data = getAuthRegistryData();
    const employees = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        const empName = data[i][0].toString().trim();
        const checkSuper = SUPER_ADMIN_USERNAMES.some(admin => admin.toLowerCase().trim() === empName.toLowerCase());
        
        if (sessionData.isSuperAdmin) { 
          if (!checkSuper) employees.push(empName); 
        } else if (sessionData.explicitTeam.some(member => member.toLowerCase() === empName.toLowerCase())) { 
          employees.push(empName); 
        }
      }
    }
    
    sessionData.explicitTeam.forEach(member => employees.push(member));
    return [...new Set(employees)].sort((a, b) => a.localeCompare(b));
  } catch (e) { return []; }
}

function fetchUsers(requestingUser) {
  try {
    const sessionData = verifySession(requestingUser);
    if (!sessionData.isSuperAdmin) throw new Error("Access Denied.");
    
    const data = getAuthRegistryData();
    if (data.length <= 1) return { success: true, users: [] };
    
    const users = [];
    for(let i = 1; i < data.length; i++) {
        if(data[i][0]) {
            const empName = data[i][0].toString().trim();
            const checkSuper = SUPER_ADMIN_USERNAMES.some(admin => admin.toLowerCase().trim() === empName.toLowerCase());
            users.push({ name: empName, password: data[i][1] ? data[i][1].toString() : '', email: data[i][2] ? data[i][2].toString() : '', row: i + 1, isSuper: checkSuper });
        }
    }
    return { success: true, users: users };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function saveUser(requestingUser, userData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sessionData = verifySession(requestingUser);
    if (!sessionData.isSuperAdmin) throw new Error("Access Denied.");
    
    if (!userData.row && !userData.type) throw new Error("User Type is required for new users.");
    
    const ss = SpreadsheetApp.openById(AUTH_WORKBOOK_ID);
    const sheet = ss.getSheetByName(AUTH_SHEET_NAME) || ss.getSheetByName('Sheet2');
    const data = sheet.getDataRange().getValues();
    
    for(let i = 1; i < data.length; i++) {
        const existingName = data[i][0] ? data[i][0].toString().toUpperCase() : '';
        if (existingName === userData.name.toUpperCase() && (i + 1) !== userData.row) return { success: false, message: "User ID already exists." };
    }
    
    if (userData.row) {
        sheet.getRange(userData.row, 1, 1, 3).setValues([[userData.name, userData.password, userData.email]]);
        clearAuthCache();
        return { success: true, message: "User updated successfully." };
    } else {
        sheet.appendRow([userData.name, userData.password, userData.email]);
        clearAuthCache();
        
        try {
            const typeWorkbook = SpreadsheetApp.openById(SPREADSHEET_ID);
            let typeSheet = typeWorkbook.getSheetByName('Sheet2');
            
            if (!typeSheet) {
                typeSheet = typeWorkbook.insertSheet('Sheet2');
                typeSheet.appendRow(['User Name', 'Type']);
            }
            typeSheet.appendRow([userData.name, userData.type]);
        } catch (e) { console.error("Failed to append User Type info: " + e.message); }
        
        if (userData.email) {
            try {
                const appUrl = ScriptApp.getService().getUrl();
                const sanitizedName = userData.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const emailHtml = `
                    <div style="font-family: 'Segoe UI', Inter, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                        <div style="background-color: #4338ca; padding: 28px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">Welcome to Enterprise Portal</h1>
                        </div>
                        <div style="padding: 36px 32px; color: #1e293b;">
                            <p style="font-size: 16px; margin-bottom: 24px; line-height: 1.5;">Hello <strong>${sanitizedName}</strong>,</p>
                            <p style="font-size: 15px; margin-bottom: 28px; line-height: 1.6; color: #475569;">Your enterprise access account has been successfully provisioned. Below are your secure login credentials to access the expense management platform:</p>
                            
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                                <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;"><strong>User ID:</strong> <span style="color: #0f172a; font-family: monospace; font-size: 15px; float: right;">${sanitizedName}</span></p>
                                <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Password:</strong> <span style="color: #0f172a; font-family: monospace; font-size: 15px; float: right;">${userData.password}</span></p>
                            </div>

                            <div style="text-align: center; margin-bottom: 36px;">
                                <a href="${appUrl}" style="background-color: #4338ca; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Open Application</a>
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                            &copy; ${new Date().getFullYear()} Enterprise Expense Management. All rights reserved.
                        </div>
                    </div>
                `;
                
                MailApp.sendEmail({ to: userData.email, subject: "Welcome to Expense Portal - Account Access Provisioned", htmlBody: emailHtml });
            } catch (emailErr) { console.error("Email delivery failed: " + emailErr.message); }
        }
        
        return { success: true, message: "User provisioned successfully." };
    }
  } catch (error) { return { success: false, message: error.toString() }; } finally { lock.releaseLock(); }
}