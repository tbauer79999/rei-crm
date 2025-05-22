# REI-CRM

A lightweight, AI-enhanced CRM built for real estate wholesalers. This system automates lead tracking, provides SMS outreach capabilities (Twilio integration pending/future), and aims for AI-driven qualification using a modern tech stack. The backend is powered by Node.js with Express, and it uses Supabase for its database and authentication services. The frontend is a responsive React application.

---

## 🚀 Features

- ✅ User Authentication (Login, Signup)
- ✅ Secure API endpoints using JWT.
- ✅ Lead Management (Properties): Create, view, update status, bulk upload via CSV.
- ✅ Message Tracking: Log communications related to leads.
- ✅ Analytics Dashboard: Visualize lead data, campaign performance, and status progression.
- ✅ Knowledge Base: Store and retrieve documents for AI context.
- ✅ Customizable Platform Settings: Includes AI instruction bundle management.
- ✅ Dynamic Recents Section: Quickly access recently viewed leads and messages.

---

## 🛠️ Tech Stack

-   **Frontend:** React, Tailwind CSS
-   **Backend:** Node.js, Express.js
-   **Database & Auth:** Supabase
-   **Potentially (Future/Not yet in codebase):** Twilio (for SMS)

---

##📋 Prerequisites

-   Node.js (v16 or newer recommended)
-   npm (comes with Node.js)
-   A Supabase account and an active project.

---

## ⚙️ Environment Variables

For the application to run correctly, you'll need to set up the following environment variables.

### Backend (`.env` file in project root)

Create a file named `.env` in the root of your project and add the following:

```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_or_service_role_key
# Example:
# SUPABASE_URL=https://xyzabcdefghijklmnop.supabase.co
# SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjQ5OTIwMCwiZXhwIjoxOTMxODU5MjAwfQ.abcdefghijklmnopqrstuvwxyzABCDEFGH
```

-   `PORT`: The port on which the Node.js server will run (defaults to 5000 if not set).
-   `SUPABASE_URL`: Your Supabase project URL.
-   `SUPABASE_KEY`: Your Supabase project `anon` key (if client-side operations from server are needed) or `service_role` key (for admin-level operations). For server-to-server, `service_role` is common.

### Frontend (`.env` or `.env.local` file in project root)

Create a file named `.env` (or `.env.local` for local overrides, preferred) in the root of your project for the React application:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_KEY=your_supabase_anon_key
# Example:
# REACT_APP_SUPABASE_URL=https://xyzabcdefghijklmnop.supabase.co
# REACT_APP_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjQ5OTIwMCwiZXhwIjoxOTMxODU5MjAwfQ.abcdefghijklmnopqrstuvwxyzABCDEFGH
```

-   `REACT_APP_SUPABASE_URL`: Your Supabase project URL.
-   `REACT_APP_SUPABASE_KEY`: Your Supabase project `anon` key (this is public and used by the client-side React app).

**Important:** Ensure your `.env` files are added to your `.gitignore` to prevent committing sensitive keys.

---

## 🏁 Setup and Running Instructions

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd <repository_name>
    ```

2.  **Install Dependencies:**
    This project uses a single `package.json` in the root for both backend and frontend dependencies.
    ```bash
    npm install
    ```

3.  **Configure Backend:**
    *   Create the `.env` file in the project root as described in the "Environment Variables" section above, providing your `PORT`, `SUPABASE_URL`, and `SUPABASE_KEY`.

4.  **Configure Frontend:**
    *   Create the `.env` or `.env.local` file in the project root as described for the frontend, providing `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_KEY`.

5.  **Run the Backend Server:**
    ```bash
    node server.js
    ```
    The server should start on the port specified in your `.env` file (e.g., 5000).

6.  **Run the Frontend React App:**
    In a new terminal window, from the project root:
    ```bash
    npm start
    ```
    This will launch the React development server, typically on `http://localhost:3000`.

---

## 🗂️ Database Schema (Supabase)

The application relies on several tables within your Supabase project:

-   **`users` (managed by Supabase Auth):** Stores user authentication data (email, password hashes, etc.).
-   **`properties`:** Core table for managing leads/properties. Includes fields like `owner_name`, `property_address`, `campaign`, `status`, `status_history`, and other lead-specific details.
-   **`messages`:** Stores communication logs related to properties, including `direction` (inbound/outbound), `body`, `timestamp`, and a link to the `property_id`.
-   **`platform_settings`:** A key-value store for application-wide settings, such as `Campaigns` lists, AI instruction bundles (`aiInstruction_bundle`), etc.
-   **`knowledge_base`:** Stores documents and their content (extracted text) for the AI knowledge base feature, including `title`, `file_name`, and `content`.

(Note: You will need to set up these tables and their columns in your Supabase project dashboard according to the application's needs, inferred from API routes and component data handling.)

---

## 🌐 API Endpoints

The backend Express server exposes the following main API routes (all prefixed with `/api` and require JWT authentication):

-   `/api/properties`: For CRUD operations on properties/leads and bulk upload.
-   `/api/messages`: For fetching messages related to properties.
-   `/api/analytics`: For retrieving data for the analytics dashboard.
-   `/api/settings`: For managing platform settings, including AI instructions.
-   `/api/knowledge`: For managing knowledge base documents (upload, list, view, delete, bundle).

---

## 📁 Code Structure

A brief overview of the main directories:

-   **`server.js`**: The main entry point for the Node.js/Express backend server.
-   **`supabaseClient.js`**: Initializes the Supabase client for server-side use.
-   **`src/`**: Contains the frontend React application code.
    -   **`api_routes/`**: (Backend concern, though located in `src/` in this structure) Contains individual Express router modules for different API resources.
    *   **`components/`**: Reusable UI components for the React app.
        -   `Layout.jsx`: Main application layout including sidebar and header.
        -   `ProtectedRoute.jsx`: Handles route protection for authenticated users.
        -   `ui/`: Shadcn/ui inspired components.
    *   **`context/`**: React context providers (e.g., `AuthContext.jsx`).
    *   **`lib/`**: Client-side helper functions, services, and Supabase client initialization.
        -   `authService.js`: Functions for user authentication (signup, login, logout).
        -   `apiClient.js`: Axios instance configured for making authenticated API calls.
        -   `supabaseClient.js`: Initializes the Supabase client for frontend use.
    *   **`pages/`**: Top-level page components corresponding to different routes.
        -   `LoginPage.jsx`, `SignupPage.jsx`
        -   `Dashboard.jsx`, `Analytics.jsx`, `Settings.jsx`, etc.
    *   **`App.js`**: Main React application component, sets up routing.
    *   **`index.js`**: Entry point for the React application.

---

## 💾 Backup

Supabase provides automated daily backups for your database. You can also perform manual backups from your Supabase project dashboard. For code, regular commits to your Git repository are recommended.
The old "Daily Backup Routine" using raw git commands has been removed as it's standard Git practice.

```
The previous `README.md` included table structures for Airtable. These have been removed as the project now uses Supabase. Refer to the "Database Schema (Supabase)" section for a high-level overview of the new database structure.
