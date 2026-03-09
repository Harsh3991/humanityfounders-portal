# Humanity Founders Employee Portal

## Project Overview & Purpose
The Humanity Founders Portal is a custom, fully integrated internal management application built to streamline daily operations for an organization. Its primary purpose is to serve as a centralized hub where employees can log their attendance, track working hours, generate end-of-day reports, and actively collaborate on complex projects. 

For the administration, the portal provides a high-level, real-time "Oversight" capability, allowing them to monitor resource allocation, track overall team productivity, review individual task loads, and automatically manage follow-ups for overdue or extended deadlines without needing to rely on disparate tools. 

## Tech Stack
**Frontend:**
- **React.js & TypeScript:** For building a robust, statically-typed, and scalable user interface.
- **Tailwind CSS:** For creating a completely custom, responsive, and aesthetic dark-themed UI with specific brand gold accents.
- **Lucide React:** For modern, consistent iconography.
- **Vite:** As the build tool for lightning-fast frontend compilation.
- **React Router:** For seamless single-page application navigation.

**Backend:**
- **Node.js & Express.js:** Providing a fast, non-blocking REST API architecture.
- **MongoDB & Mongoose:** A flexible NoSQL database to handle highly relational structures like nested subtasks and project assignments.
- **JSON Web Tokens (JWT):** For secure, stateless user authentication and role-based access control (Admin vs Employee).
- **Node Cron:** For automated background jobs (e.g., daily midnight sweeps to send overdue task reminder emails).
- **Nodemailer:** For reliable outbound transactional emails.

## The Problem Solved
Prior to using this portal, the organization lacked a unified way to connect "time spent" with "tasks completed". Project managers and administrators struggled with:
1. **Scattered Workflows:** Employees were tracking time in one place, managing tasks in another, and sending end-of-day updates via email or Slack.
2. **Lack of Transparency:** Admins had no easy way to see exactly who was working on what, how many hours were actually being spent, or if an employee was currently actively clocked in.
3. **Task Slippage:** It was difficult to keep track of tasks falling behind schedule without manually checking tracking sheets. Parent tasks with multiple sub-dependencies were especially hard to track to completion.

**The Solution:** This centralized portal forces all activity into a single pipeline. When an employee clocks out, they are required to submit a comprehensive daily report (minimum 100 characters). Admins can look at an employee's profile and instantly see their daily active hours, attendance history, and the exact status of every task assigned to them, complete with automatically calculated "Overdue" or "Deadline Extended" flags.

## Project Impact
- **Automated Accountability:** With mandatory end-of-day reports tied directly to the clock-out system, there is no more ambiguity regarding what was accomplished during active hours.
- **Drastically Reduced Admin Overhead:** The real-time Dashboard and dedicated Task Oversight views allow management to get an immediate pulse of the entire company's productivity without interrupting workers.
- **Proactive Management:** Automated emails for missed attendances and overdue tasks ensure that nothing slips through the cracks, allowing issues to be addressed before they become critical blockers.

## Challenges Overcome
- **Complex Hierarchical Data:** Designing a flexible backend schema to support infinite-depth subtasks on the `Task` model, while keeping queries lightweight for the frontend tree view.
- **Timer State Management:** Ensuring the precise tracking of active "Working" seconds while handling browser reloads, optimistic UI updates, and the transition between "Clocked In", "Away", and "Clocked Out" states.
- **Dynamic Role-Based Filtering:** Building an intelligent UI that adapts itself based on whether the logged-in user is a standard Employee or an Admin, heavily restricting or unlocking features (like full Directory Oversight) dynamically.
- **Custom UI Implementation:** Creating a fully bespoke drag-and-drop task ordering system and complex popover menus (for date pickers, priority flags, and assignees) without relying on heavy UI component libraries.

## My Contribution
I independently built the **entire application from scratch** based purely on a Product Requirements Document (PRD) provided by the client. 

My responsibilities included:
1. **System Architecture:** Designing the complete MongoDB schema, defining the RESTful API endpoints, and structuring the frontend component hierarchy.
2. **Full-Stack Development:** Writing all backend controllers, middleware, and database logic, alongside the entirety of the React frontend, custom hooks, and context providers.
3. **UI/UX Implementation:** Translating the client's vision of a premium, dark-mode-first aesthetic (utilizing specific dark matte and gold accents) into fully functional, responsive CSS.
4. **DevOps & Polish:** Setting up automated email services via cron jobs, refining complex state management (like real-time attendance clocks), and ensuring a highly polished final deliverable ready for production use.