# expenseapp-octo-memory
A secure, responsive Enterprise Expense Management Dashboard built with Google Apps Script. Features role-based access control (Admin/User), dynamic data filtering, automated PDF/CSV report generation, and AI-powered financial auditing using the Gemini API. Transforms Google Sheets into a powerful, scalable SaaS-like expense tracking portal.

### Enterprise Expense Management Dashboard

A secure, serverless enterprise web application built on Google Apps Script (GAS). This dashboard transforms Google Sheets and Google Drive into a highly scalable, SaaS-like expense tracking portal. It features role-based access control, dynamic financial reporting, automated document generation (PDF/CSV), and AI-powered financial auditing using the Gemini API.

### 🚀 Key Features

Core Capabilities

**Role-Based Access Control (RBAC):** Distinct workflows for `SUPER ADMIN` and Standard Users, managed via a secure, detached authentication registry.
Smart Data Entry Grid:** Spreadsheet-like interface allowing multi-row data entry, automated vehicle mileage calculations, and dynamic dropdowns.
Mandatory Compliance Validation:** Enforces receipt/document uploads strictly when GST values exceed zero.
Advanced Analytics & Reporting:** Real-time summary highlights with multi-parameter filtering (by User, Date Range, etc.).
**Automated Exports:** One-click generation of beautifully formatted A4 Landscape PDFs and structured CSV files based on active filters.

### AI-Powered Intelligence (Gemini API)

* **Automated Auditing:** Super Admins can trigger an AI review of filtered expenses to detect anomalies and overarching spending patterns.
* **Cash Flow Forecasting:** Generates 30-day projected cash flow requirements based on historical daily burn rates.
* **Smart Insights:** Automatically analyzes active report tables to identify budget-skewing categories and daily averages.

### UI / UX Design

* **Premium SaaS Aesthetic:** Custom CSS architecture utilizing glassmorphism modals, tailored shadows, and a modern color palette.
* **Mobile-First Responsiveness:** Automatically transforms desktop data grids into scrollable, card-based layouts with bottom-sheet modals and fixed navigation bars on mobile devices.

---

## 🏗 System Architecture

* **Frontend:** HTML5, Custom CSS3, Vanilla JavaScript, Bootstrap 5 (Utility Classes), Google Material Symbols.
* **Backend:** Google Apps Script (V8 Runtime) serving as the API and controller.
* **Database:** Google Sheets (acts as the primary data store and authentication registry).
* **Storage:** Google Drive (for PDF exports and uploaded receipt screenshots).
* **AI Engine:** Google Gemini 1.5 Flash (via REST API).

---

## 🛠 Configuration & Setup

### 1. Prerequisites

To deploy this application, you will need a Google Account and three separate Google Sheets:

1. **Main Database:** To store the actual expense records.
2. **Auth Registry:** A highly secure sheet restricted to system administrators to store User IDs, Passwords, and Emails.
3. **Dropdown Targets:** A sheet to maintain dynamic lists for Locations and Custom Remarks.

### 2. Environment Variables (`Config.js`)

Update the variables in the `Config.js` file with your specific Google Workspace IDs:

* `SPREADSHEET_ID`: ID of the Main Database workbook.
* `SHEET_NAME`: Sheet name for expense records (e.g., 'Expenses').
* `AUTH_WORKBOOK_ID`: ID of the Auth Registry workbook.
* `AUTH_SHEET_NAME`: Sheet name for credentials.
* `TARGET_WORKBOOK_ID`: ID of the Dropdown Targets workbook.
* `PDF_FOLDER_ID`: Google Drive Folder ID where exported PDFs will be saved.
* `SCREENSHOT_FOLDER_NAME`: Name of the Drive folder for receipt uploads.
* `GEMINI_API_KEY`: Your Google Gemini API Key for AI integrations.

### 3. Super Admin & Team Scopes

Define system administrators and explicit management scopes directly in the configuration file to bypass standard database checks for ultimate control.

---

## 📦 Deployment Methods

### Option A: Using `clasp` (Recommended)

1. Clone this repository to your local machine.
2. Install Google's command-line tool: `npm install -g @google/clasp`.
3. Login to your Google account: `clasp login`.
4. Create a new Apps Script project: `clasp create --type webapp --title "Expense Portal"`.
5. Push the code: `clasp push`.
6. Deploy the web app from the Google Apps Script editor.

### Option B: Manual Copy-Paste

1. Go to `script.google.com` and create a new project.
2. Create the exact files listed in this repository (`Index.html`, `Code.gs`, `Style.html`, etc.).
3. Copy the contents of each file from this repository into the corresponding file in the script editor.
4. Click **Deploy** -> **New Deployment** -> **Web App**.
5. Set "Execute as" to `Me` and "Who has access" to `Anyone`.

---

## 🔒 Security Notes

* **Data Isolation:** Authentication logic is strictly separated from standard expense data.
* **Session Management:** Implements an inactivity timeout that securely logs the user out and clears the DOM state after 60 minutes of idleness.
* **Sanitization:** User inputs (especially inside the AI prompts and HTML emails) are sanitized to prevent injection attacks.

---

Would you like me to also write a `CONTRIBUTING.md` file to outline how other developers can submit pull requests and adhere to this project's coding standards?
