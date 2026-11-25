# Campus Kart — Student Marketplace & Services Platform

Campus Kart is a modern, responsive, student-focused peer-to-peer web application designed initially for **Chandigarh University (Gharuan, Mohali)** students, with architecture built to expand to neighboring universities across Punjab and Chandigarh Tricity.

---

## 🌟 Key Features

### 1. 🛍️ Campus Marketplace
- **Listing Types**:
  - **For Sale**: Textbooks, gaming laptops, calculators, room coolers, furniture.
  - **For Rent**: Daily or weekly campus rentals for bicycles, DSLR cameras, lab equipment with security deposit terms.
  - **Free / Giveaway**: Study aids, whiteboards, and notes passed down to junior peers.
  - **Wanted / For Purchase**: Post requests for needed gear.
- **Search & Filters**: Instant multi-attribute filtering by category, listing type, price range, condition, campus location, and sorting.
- **Listing Management**: Edit listings, update availability status (Available, Sold, Rented, Unavailable), or delete listings.

### 2. 💼 Student Services & Freelance Hub
- Categories:
  - Project guidance and development assistance
  - Programming and coding help (C++, Java, Python, React, Full-stack)
  - Presentation and PPT design for semester evaluations and hackathons
  - ATS-friendly resume and portfolio creation
  - Campus event and fest photography
  - Assignment tutoring and academic assistance
- **Academic Integrity Commitment**: Clear terms promoting learning, mentorship, and guidance over dishonest work.

### 3. 📚 Notes & Study Materials Marketplace
- Upload and monetize high-quality handwritten or typed PDF study notes.
- Categorized by subject, degree/course (e.g., B.Tech CSE, MBA, Biotech), and semester.
- Free preview pages and instant simulated payment integration to unlock full PDF downloads.

### 4. 💬 Real-Time Buyer-Seller Chat
- Private real-time messaging powered by WebSockets.
- Start conversations directly from any product or service listing with contextual details.
- Message history, delivery receipts, timestamps, and live unread indicators.

### 5. 📊 Student Dashboard
- Manage **My Products**, **My Rentals**, **My Services**, and **My Uploaded Notes** (with earnings and download metrics).
- View saved items and access all unlocked / purchased study notes.

### 6. 🔒 Authentication & Student Profiles
- University email authentication (recommended `@cuchd.in`).
- Student profile detailing course, semester, campus location, active listings, and peer reviews.

---

## 👥 Preloaded Demo Accounts

The database comes pre-seeded with verified Chandigarh University student accounts (Password for all accounts: `cu123456`):

| Student Name | University Email | Role / Department | Notes |
|---|---|---|---|
| **Aarav Sharma** | `arav.sharma@cuchd.in` | B.Tech CSE (Sem 6) | Seller (Lenovo IdeaPad, Mouse, DSA notes) |
| **Priya Singh** | `priya.singh@cuchd.in` | B.Sc Biotech (Sem 4) | Buyer & Note Uploader (Engineering Math, OS notes) |
| **Rohan Verma** | `rohan.verma@cuchd.in` | BBA (Sem 2) | Rental Owner (Hercules Cycle, Canon DSLR) |
| **Ananya Kapoor** | `ananya.kapoor@cuchd.in` | B.Design UI/UX (Sem 5) | Freelancer (PPT Design, ATS Resumes) |
| **Manpreet Kaur** | `manpreet.kaur@cuchd.in` | MBA (Sem 3) | Finance Major (Cooler, MBA Notes) |

---

## 🚀 Running the Project

### Prerequisites
- Python 3.10+ (Installed on the system)

### Start the Server
Run the application using:
```bash
python run.py
```
Or with uvicorn:
```bash
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser at **[http://127.0.0.1:8000](http://127.0.0.1:8000)**.

---

## 📁 Project Architecture

```
campus-kart/
├── .env                       # Environment configuration (Port, JWT secret, DB path)
├── run.py                     # One-click startup script
├── server/
│   ├── main.py                # FastAPI application, CORS, static routes, WebSocket chat
│   ├── database.py            # SQLite schema, tables, relations, and seed data
│   ├── auth.py                # Password hashing (bcrypt), JWT verification
│   ├── websocket_manager.py   # Real-time WebSocket connection manager
│   └── routes/
│       ├── auth_routes.py     # Signup, login, profile, password reset
│       ├── marketplace_routes.py # Products CRUD, filters, image uploads
│       ├── services_routes.py # Student services CRUD
│       ├── notes_routes.py    # Notes PDF upload, purchase & download
│       ├── chat_routes.py     # Conversation list, message history
│       └── dashboard_routes.py# Summary metrics, user listings & saved items
├── static/
│   ├── index.html             # Single Page Application HTML5 structure
│   ├── css/
│   │   └── styles.css         # Modern styling (#2563eb, #172033, Inter font)
│   └── js/
│       ├── api.js             # Client API library
│       ├── app.js             # SPA routing (all 12 pages), modals, state
│       └── chat.js            # WebSocket client, live message bubbles
└── uploads/                   # Uploaded images and PDF notes
```

---

## 🏛️ Expansion to Other Universities

Campus Kart is designed to easily onboard neighboring campuses:
- **Panjab University (PU Chandigarh)**
- **Chitkara University (Rajpura/Baddi)**
- **CGC Landran & CGC Jhanjeri**
- **Thapar University (Patiala)**

The database stores `university` per user, product, and study note, allowing immediate multi-campus filtering as the platform scales.
