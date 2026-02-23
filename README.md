# Humanity Founders Employee Management Portal

A comprehensive, full-stack Employee Management and Productivity Tracking platform designed for modern organizations. Built with a powerful Node.js/Express backend and a gorgeous, highly-interactive React/Vite frontend.

![Dashboard Preview](https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2070&auto=format&fit=crop) *(Placeholder)*

## 🌟 Key Features

### 🔐 Role-Based Access Control (RBAC)
- **Granular Permissions:** Distinct dashboards and capabilities for `admin`, `hr`, `manager`, and `employee` roles.
- **Secure Authentication:** JWT-based stateless authentication with strict token verification.

### ⏱️ Advanced Attendance & Time Tracking
- **Interactive Time Clock:** Real-time Clock-In, Clock-Out, and "Away" status toggling.
- **Micro-Tracking:** Second-by-second productivity metrics tracked and aggregated.
- **Admin Overrides:** Authorized personnel can override and adjust attendance logs as necessary.

### 📂 Project & Task Management
- **Hierarchical Tasks:** Create projects, top-level tasks, and infinitely nestable sub-tasks.
- **Assign & Track:** Assign tasks, set priorities (`Low` to `Urgent`), establish Due Dates with visual calendar integration, and track completion states.
- **Task Oversight:** Dedicated admin-level views to inspect workload distribution across the entire organization.

### 👥 Comprehensive People Directory
- **Employee Profiles:** Deep-dive into any employee's profile to view their details.
- **Split-View Architecture:** Profiles are segmented into `Personal Details` (contact info, statuses) and `Work Logs` (MTD Attendance, Project Load, Assigned Tasks).
- **Compliance & Onboarding:** Securely upload and verify mandatory onboarding documents (e.g., PAN Card, Aadhaar Card, Digital Declarations).

### 🎨 State-of-the-Art Interface
- **Modern Aesthetics:** Dark-matte design system with gold (`#d4af37`) and emerald accents.
- **Fluid Animations:** Powered by `framer-motion` for buttery smooth page transitions and micro-interactions.
- **Responsive:** Built entirely with Tailwind CSS to scale elegantly across devices.

---

## 🛠️ Technology Stack

### Backend
- **Core:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose)
- **Security:** Helmet, CORS, bcrypt, JSON Web Tokens (JWT)
- **File Storage:** Cloudinary (for secure document uploads)
- **Utilities:** Nodemailer (automated onboarding emails)

### Frontend
- **Core:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS, Shadcn UI (Radix UI primitives)
- **Icons & Visuals:** Lucide React
- **Animations:** Framer Motion
- **Routing:** React Router DOM
- **State/Fetching:** Axios, Context API

---

## 🚀 Getting Started Locally

### Prerequisites
Make sure you have Node.js and npm installed on your machine.

### 1. Clone & Setup
Clone the repository to your local machine:
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory with the following variables:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:5173

# Cloudinary (Document Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

Start the local backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the Vite development server:
```bash
npm run dev
```
Your frontend will now be accessible at `http://localhost:5173` (or the port Vite provides) and happily talking to your Express API!

---

## 🌩️ Deployment to Vercel

This repository is strictly configured to be deployed natively onto Vercel's zero-config serverless infrastructure.

1. **Push your code to GitHub.**
2. **Deploy the Backend:** 
   - Add a new Vercel project pointing to your repository. 
   - Set the `Root Directory` to `backend`.
   - Add all your Backend `.env` variables to Vercel's Environment Variables panel.
   - Deploy. Grab the resultant API URL.
3. **Deploy the Frontend:**
   - Add another new Vercel project pointing to the same repository.
   - Set the `Root Directory` to `frontend`.
   - Add the `VITE_API_BASE_URL` environment variable and set it to your deployed backend URL + `/api` (e.g., `https://my-backend.vercel.app/api`).
   - Deploy!
4. **Finalize CORS:**
   - Take the newly generated Frontend URL and add it as the `FRONTEND_URL` variable in your Backend Vercel project.
   - Trigger a redeployment of the backend to update the CORS whitelist.

---

## 📄 License
Internal use only. Property of Humanity Founders. All rights reserved.
