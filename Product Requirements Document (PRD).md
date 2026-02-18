# Product Requirements Document (PRD)

## Project: Humanity Founders - Employee Management Portal

**Version:** 2.1
**Status:** Draft

## 1. Executive Summary

The **Humanity Founders Employee Management Portal** is a centralized web-based platform designed to streamline internal operations. It serves as the single source of truth for attendance tracking, project management, and employee documentation.

The goal is to replace fragmented tools with a unified system that strictly enforces hierarchy-based access control, ensuring data privacy while empowering employees to manage their tasks effectively.

## 2. Objectives & Value Proposition

- **Centralization:** Consolidate HR and Project Management into one interface.
- **Accountability:** Real-time tracking of task deadlines and attendance clock-ins.
- **Role-Based Security:** Strict data segregation ensuring employees only see what is relevant to them, while Management, HR, and Admins have broader oversight.
- **Efficiency:** Automate the flow of information regarding project status and attendance records.

## 3. User Roles & Permissions

### 3.1 Role Definitions

1. **Admin (Super User):** Absolute control over the system, including system configuration and admin management.
2. **HR (Human Resources):** High-level control for people management, onboarding, and compliance.
3. **Manager:** Operational control over teams, project assignments, and productivity monitoring.
4. **Employee:** Restricted access limited to personal dashboard, assigned tasks, and own attendance.

### 3.2 Permissions Matrix

| Feature / Action | Employee | Manager | HR | Admin |
| --- | --- | --- | --- | --- |
| **Login** | ✅ | ✅ | ✅ | ✅ |
| **Onboarding (First Time)** | ✅ | ✅ | ✅ | ❌ |
| **View Own Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Clock In / Clock Out** | ✅ | ✅ | ✅ | ✅ |
| **View Own Attendance** | ✅ | ✅ | ✅ | ✅ |
| **View Team Attendance** | ❌ | ✅ | ✅ | ✅ |
| **View/Edit Projects** | Own Projects Only | All | All | All |
| **Create Tasks/Subtasks** | ✅ | ✅ | ✅ | ✅ |
| **Assign Tasks to Others** | ✅ | ✅ | ✅ | ✅ |
| **Add/Delete Employees** | ❌ | ❌ | ✅ | ✅ |
| **Edit Employee Details** | ❌ | ❌ | ✅ | ✅ |
| **Remove/Edit Admin Users** | ❌ | ❌ | ❌ | ✅ |

## 4. User Flow Summary

1. **Login:** User enters credentials provided by HR.
2. **Validation:**
    - *First Login:* Redirects to **Onboarding Module** (Mandatory).
    - *Subsequent Logins:* Redirects to **Dashboard**.
3. **Dashboard:** Personalized view based on Role (Employee vs. Management).
4. **Navigation:** Access to specific tabs (Projects, Attendance, People) based on permissions.

## 5. Detailed Feature Specifications

### 5.1 Authentication & Onboarding

**Entry Point:** All users must authenticate here.

- **Secure Login:** Email/Password authentication.
- **Provisioning (HR/Admin Only):**
    - HR creates an account using **Full Name**, **Gmail Address**, **Department**, **Role**, and **Password**.
    - Status is set to "Pending" until onboarding is complete.
- **Onboarding Wizard (Mandatory New User Flow):**
    - **Trigger:** Activates immediately when a "Pending" user logs in. Navigation is locked.
    - **Step 1: Financials & Identity:**
        - Input: Bank Name, Account Number, IFSC Code.
        - Upload: Aadhaar Card (PDF/Img), PAN Card (PDF/Img).
    - **Step 2: Digital Declaration:**
        - Display: *"I acknowledge that I have carefully read and understood the company ethics. I will follow these standards to maintain a professional and proper work environment."*
        - Action: Checkbox ("I Agree") + Digital Signature (Type Full Name).
    - **Completion:** Status updates to "Active"; User redirected to Dashboard.

### 5.2 The Dashboard (Home Tab)

The central hub is customized by role.

### **A. Employee Dashboard View**

- **Header:** "Welcome, [Name] - [Department]"
- **Attendance Widget:**
    - **Clock In(”start”):** Only enabled if the previous day was closed properly.
    - **Clock Out:** Opens mandatory **Daily Report** pop-up (Text area for "What was accomplished?").
    - **Timer:** Real-time session duration.
    - Away: To stop timer when employee is taking a brake
- **My Tasks (Priority Card):**
    - **Filter:** Tasks assigned to the user across **all** active projects.
    - **Sort:** Strict chronological order by Due Date (Overdue/Today at top in Red).
    - **Columns:** Task Name | Project Name | Due Date.
- **Monthly Stats:** Summary of Days Present vs. Absences/Leaves.
- **Active Projects:** List of currently assigned projects.

### **B. Management Dashboard View (Manager/HR/Admin)**

- **Personal Widgets:** Clock In/Out, Daily Report, Personal Tasks (same as Employee).
- **Team Overview:** Real-time counter of employees currently "On Duty".
- **Resource Availability Card (New):**
    - **Content:** List of employees with **Zero** active tasks.
    - **Action:** "Assign Task" button (Shortcuts to Project Tab).
- **Pending Requests:** Leave requests or administrative alerts.

### 5.3 Project Management Tab

A hierarchical task system (Project > Task > Subtask).

- **Project Structure:**
    - **Multi-Project Support:** Employees can belong to multiple projects simultaneously.
    - **Visibility:** Employees see only their projects; Managers/HR/Admin see all.
- **Task Management:**
    - **Create Task:** Available to all users.
    - **Fields:** Name, Assignee (Searchable User List), Deadline, Priority (Low/Med/High), Description.
    - **Sub-Tasks:** Expandable items under a parent task with independent completion states.
- **Workflow:** Status changes move from *To Do* -> *In Progress* -> *Review* -> *Done*.

### 5.4 Attendance Management Tab

### **A. Employee View (Personal)**

- **Interactive Calendar:**
    - Month/Year Toggle.
    - **Color Coding:** Green (Present), Red (Absent).
- **Report Access:** Clicking a **Green** date opens a pop-up showing that day's submitted **Daily Report**.
- **History Log:** List view of timestamps below the calendar.

### **B. Management View (Supervisory)**

- **Layout:** Split-screen interface.
- **Sidebar (Employee Directory):**
    - Search by Name.
    - Filter by Department or Status (Clocked In / Absent).
    - Select an employee to view their specific calendar.
- **Main View (Individual Calendar):**
    - Displays the selected employee's attendance grid.
    - **Action:** HR/Admin can click dates to view Daily Reports or manually correct attendance status.

### 5.5 People & Directory Tab

**Access:** Restricted to HR & Admin.

- **Employee Database:** Searchable list of all staff.
- **Profile Management:**
    - **View/Edit Personal Info:** Name, Address, Phone, Email, Role, Start Date.
    - **View/Edit Financials:** Bank Details (Account/IFSC).
    - **View Documents:** Access uploaded Aadhaar and PAN cards.
- **Administrative Actions:**
    - **Add Employee:** Triggers the provisioning flow (see Section 5.1).
    - **Offboard/Delete:** Revokes access immediately.

## 6. Non-Functional Requirements

1. **Security:** All PII (Personally Identifiable Information) and Banking data must be encrypted at rest.
2. **Responsiveness:**
    - Desktop/Tablet: Full functionality.
    - Mobile: Optimized specifically for "Clock In/Out" and "Daily Report" actions.
3. **Audit Trails:** (Admin Only) Logs for employee creation, deletion, and attendance manual overrides.
4. **Performance:** Dashboard load time < 2 seconds.

## 7. Tech Stack Recommendations

- **Frontend:** React.js (Component-based architecture for Cards/Widgets).
- **Backend:** Node.js/Express.
- **Database:** PostgreSQL (Relational integrity for Attendance/Users).
- **Auth:** Firebase Authentication or Custom JWT.