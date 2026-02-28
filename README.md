# 🥗 Healthy Habits Tracker - Backend API

This is the robust RESTful API powering the **Healthy Habits Tracker** application. It handles user authentication, secure data persistence, and habit management logic using Node.js, Express, and Supabase.

---

## 🔗 Project Links

**Frontend Repository:** [https://github.com/ARCHANA-MADDELA-57/healthy-habits-Tracker-frontend](https://github.com/ARCHANA-MADDELA-57/healthy-habits-Tracker-frontend)

**Live Application (Netlify):** [https://healthy-habits-trackerr.netlify.app/](https://healthy-habits-trackerr.netlify.app/)

**Backend API (Render):** [https://healthy-habits-tracker-backend.onrender.com](https://healthy-habits-tracker-backend.onrender.com)

---

## 📌 Project Overview
The backend serves as the secure bridge between the React frontend and the Supabase. It ensures that user data is isolated, passwords are encrypted, and every request is validated via JSON Web Tokens (JWT).

### Key Responsibilities:
* **Authentication:** Secure signup and login flows using industry standards.
* **Authorization:** Custom middleware to protect habit-related routes.
* **Data Validation:** Ensuring habit progress, targets, and user IDs are handled correctly.
* **Database Integration:** Performing efficient CRUD operations on Supabase (PostgreSQL).

---

## 🛠 Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** Supabase (PostgreSQL)
* **Security:** JWT (JSON Web Tokens) & bcrypt
* **Middleware:** CORS, Express JSON Parser, Auth Middleware
* **Deployment:** Render

---

## 🏗️ System Architecture
The API follows a modular structure to ensure maintainability and separation of concerns:



1.  **Routes:** Defines the API endpoints and maps them to controllers.
2.  **Controllers:** Logic for processing requests, interacting with the database, and returning responses.
3.  **Middleware:** Functions that handle JWT verification and request logging.
4.  **Database:** Persistent storage layer managed via Supabase's PostgreSQL engine.

---

## 📡 API Documentation

### 🔐 Auth Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new user (Hashes password with bcrypt). |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token. |

### 🥗 Habit Endpoints (Protected)
*All habit routes require an `Authorization: Bearer <token>` header.*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/habits/my-habits` | Fetch all habits belonging to the authenticated user. |
| `POST` | `/api/habits/add` | Create a new habit linked to the user's UUID. |
| `PUT` | `/api/habits/update/:id` | Update title, description, or target value. |
| `PATCH` | `/api/habits/increment/:id` | Increase current progress count by 1. |
| `PATCH` | `/api/habits/decrement/:id` | Decrease current progress count by 1. |
| `DELETE` | `/api/habits/:id` | Permanently remove a habit from the database. |

---

## 🗄 Database Schema (Supabase)

The database utilizes two main tables with a **One-to-Many** relationship.



### 1. Profile Table (Users)
Stores user credentials and metadata.
* `id`: UUID (Primary Key)
* `full_name`: String
* `email`: String (Unique)
* `created_at`: Timestamp

### 2. Habits Table
Stores individual habit data linked to specific users.
* `id`: UUID (Primary Key)
* `user_id`: UUID (Foreign Key -> profile.id)
* `title`: String
* `target`: Integer (Goal)
* `current`: Integer (Current Progress)
* `is_everyday`: Boolean
* `completed_today`: Boolean

---

## ⚙️ Installation & Local Setup

### 1️⃣ Clone the repository
```bash
git clone [https://github.com/ARCHANA-MADDELA-57/healthy-habits-tracker-backend.git](https://github.com/ARCHANA-MADDELA-57/healthy-habits-tracker-backend.git)
cd healthy-habits-tracker-backend