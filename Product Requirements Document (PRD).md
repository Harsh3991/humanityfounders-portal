# Product Requirements Document (PRD)

## Project: Humanity Founders - Employee Management Portal

**Version:** 2.1
**Status:** Draft

## 1. Executive Summary

The **Humanity Founders Employee Management Portal** is a centralized web-based platform designed to streamline internal operations. It serves as the single source of truth for attendance tracking, project management, and employee documentation.

The goal is to replace fragmented tools with a unified system that strictly enforces hierarchy-based access control, ensuring data privacy while empowering employees to manage their tasks effectively.

## 2. Objectives & Value Proposition

- **Centralization:** Consolidate Administration and Project Management into one interface.
- **Accountability:** Real-time tracking of task deadlines and attendance clock-ins.
- **Role-Based Security:** Strict data segregation ensuring employees only see what is relevant to them, while Admins have complete oversight.
- **Efficiency:** Automate the flow of information regarding project status and attendance records.

## 3. User Roles & Permissions

### 3.1 Role Definitions

1. **Admin (Super User):** Absolute control over the system, including employee management, onboarding oversight, project supervision, and system configuration.
2. **Employee:** Restricted access limited to personal dashboard, assigned tasks, and own attendance.

### 3.2 Permissions Matrix

| Feature / Action | Employee | Admin |
| --- | --- | --- |
| **Login** | ✅ | ✅ |
| **Onboarding (First Time)** | ✅ | N/A |
| **View Own Dashboard** | ✅ | ✅ |
| **Clock In / Clock Out** | ✅ | ✅ |
| **View Own Attendance** | ✅ | ✅ |
| **View All Employees' Attendance** | ❌ | ✅ |
| **View/Edit Projects** | Own Projects Only | All |
| **Create Tasks/Subtasks** | ✅ | ✅ |
| **Assign Tasks to Others** | ✅ | ✅ |
| **View Employee Task Load** | ❌ | ✅ |
| **Add/Delete Employees** | ❌ | ✅ |
| **Edit Employee Details** | ❌ | ✅ |
| **Manage Admins** | ❌ | ✅ |

## 4. User Flow Summary

1. **Provisioning:** Admin creates a "Pending" account for the employee.
2. **Login:** User enters credentials provided by Admin.
3. **Validation:**
    - *First Login:* Redirects to **Onboarding Module** (Mandatory).
    - *Subsequent Logins:* Redirects to **Dashboard**.
4. **Dashboard:** Personalized view based on Role (Employee vs. Admin).
5. **Navigation:** Access to specific tabs (Projects, Attendance, People, Task Oversight) based on permissions.

## 5. Functional Requirements (By Module)

### 5.1 Module: Authentication & Onboarding

**Entry Point:** All users must authenticate here.

- **Secure Login:** Email/Password authentication.
- **Provisioning (Admin Only):**
    - Admin inputs: **Full Name**, **Gmail Address**, **Department**, **Role**, and **Temporary Password**.
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

### 5.2 Module: Dashboard (Home Tab)

The central hub customized by role.

### **A. Employee Dashboard View**

- **Header:** "Welcome, [Name] - [Department]"
- **Attendance Widget:**
    - **Clock In:** Enabled only if previous day is closed.
    - **Clock Out:** Opens mandatory **Daily Report** pop-up.
    - **Timer:** Real-time session duration.
- **My Tasks (Priority Card):**
    - **Filter:** Tasks assigned to the user across **all** active projects.
    - **Sort:** Strict chronological order by Due Date (Overdue/Today at top in Red).
    - **Columns:** Task Name | Project Name | Due Date.
- **Monthly Stats:** Summary of Days Present vs. Absences/Leaves.
- **Active Projects:** List of currently assigned projects.

### **B. Admin Dashboard View**

- **Personal Widgets:** Clock In/Out, Daily Report, Personal Tasks.
- **Team Overview:** Real-time counter of employees currently "On Duty".
- **Resource Availability Card:**
    - **Content:** List of employees with **Zero** active tasks.
    - **Action:** "Assign Task" button (Shortcuts to Project Tab).
- **Pending Requests:** Leave requests or administrative alerts.

### 5.3 Module: Project Management

A hierarchical task system (Project > Task > Subtask).

- **Project Structure:**
    - **Multi-Project Support:** Employees can belong to multiple projects simultaneously.
    - **Visibility:** Employees see only their projects; Admins see **all** projects.
- **Task Management:**
    - **Create Task:** Available to all users.
    - **Fields:** Name, Assignee (Searchable User List), Deadline, Priority (Low/Med/High), Description.
    - **Sub-Tasks:** Expandable items under a parent task with independent completion states.
- **Workflow:** Status changes move from *To Do* -> *In Progress* -> *Review* -> *Done*.

### 5.4 Module: Admin Task Oversight

**Access:** Restricted to Admin ONLY.

A dedicated interface to monitor individual employee workloads without navigating through projects.

- **Sidebar (Employee Directory):**
    - **Search:** Search bar to find employees by Name.
    - **Filter:** Dropdown to filter list by **Department**.
    - **Selection:** Clicking an employee name loads their task data in the main view.
- **Main Content Area (Task Breakdown):**
    - **Display Logic:** Shows all active tasks assigned to the selected employee across all projects.
    - **Categorization:** Tasks are grouped by **Project Name** (e.g., "Website Redesign" group, "Marketing Campaign" group).
    - **Task Details:** Each task item displays:
        - Task Name.
        - Due Date (Color-coded for urgency).
        - Status (To Do/In Progress/Done).
        - Priority.

### 5.5 Module: Attendance Management

### **A. Employee View (Personal)**

- **Interactive Calendar:**
    - Month/Year Toggle.
    - **Color Coding:** Green (Present), Red (Absent).
- **Report Access:** Clicking a **Green** date opens a pop-up showing that day's submitted **Daily Report**.
- **History Log:** List view of timestamps below the calendar.
- **Clock-In Lockout:** Prevent clock-in if previous day's report is missing.

### **B. Admin View (Supervisory)**

- **Layout:** Split-screen interface.
- **Sidebar (Employee Directory):**
    - Search by Name.
    - Filter by Department or Status (Clocked In / Absent).
    - Select an employee to view their specific calendar.
- **Main View (Individual Calendar):**
    - Displays the selected employee's attendance grid.
    - **Action:** Admin can click dates to view Daily Reports or manually correct attendance status.

### 5.6 Module: People & Directory

**Access:** Restricted to Admin ONLY.

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

## 7. Feedback and new Features to Add

1. In Admin dashboard a card to show total employee present today
2. Multi tab layout in the employee detail page first for all personal details and second tab “Work Log” for tasks and projects and attendance
3. Store the attendance and daily update for each employee in a Google sheet
4. Send email for the Task uncompleted by the due date