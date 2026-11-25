import sqlite3
import os
import bcrypt
from datetime import datetime

DB_PATH = os.environ.get("DATABASE_PATH", "campus_kart.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    # Ensure upload dirs exist
    os.makedirs("uploads/products", exist_ok=True)
    os.makedirs("uploads/notes", exist_ok=True)
    os.makedirs("uploads/services", exist_ok=True)
    os.makedirs("uploads/profiles", exist_ok=True)

    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        university TEXT NOT NULL DEFAULT 'Chandigarh University',
        course TEXT,
        semester TEXT,
        bio TEXT,
        profile_photo TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        listing_type TEXT NOT NULL DEFAULT 'sale', -- 'sale', 'rent', 'purchase', 'giveaway'
        condition TEXT NOT NULL, -- 'Brand New', 'Like New', 'Gently Used', 'Fair'
        location TEXT NOT NULL,
        status TEXT DEFAULT 'available', -- 'available', 'rented', 'sold', 'unavailable'
        rent_rate_type TEXT DEFAULT 'per day', -- 'per day', 'per week', 'per month'
        security_deposit REAL DEFAULT 0.0,
        rental_terms TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        is_primary INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        delivery_time TEXT NOT NULL,
        image_url TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        subject TEXT NOT NULL,
        course TEXT NOT NULL,
        semester TEXT NOT NULL,
        university TEXT NOT NULL DEFAULT 'Chandigarh University',
        price REAL DEFAULT 0.0,
        file_url TEXT NOT NULL,
        preview_pages INTEGER DEFAULT 3,
        total_pages INTEGER DEFAULT 12,
        status TEXT DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_id INTEGER NOT NULL,
        user2_id INTEGER NOT NULL,
        product_id INTEGER,
        service_id INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_type TEXT NOT NULL, -- 'product', 'service', 'note'
        item_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, item_type, item_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reviewer_id INTEGER NOT NULL,
        target_user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        note_id INTEGER NOT NULL,
        amount_paid REAL NOT NULL,
        transaction_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, note_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
    ''')
    conn.commit()
    conn.close()

def seed_data():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    if count > 0:
        conn.close()
        return

    # Create dummy password hash for default users (password: 'cu123456')
    hashed = bcrypt.hashpw(b"cu123456", bcrypt.gensalt()).decode("utf-8")

    users_seed = [
        ("arav.sharma@cuchd.in", hashed, "Aarav Sharma", "Chandigarh University", "B.Tech Computer Science", "Semester 6", "Passionate coder & final year CS student at CU Gharuan. Selling tech gear and helping juniors with coding projects.", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80", "9876543210"),
        ("priya.singh@cuchd.in", hashed, "Priya Singh", "Chandigarh University", "B.Sc Biotechnology", "Semester 4", "CU Biotech enthusiast, hostel resident in Block B3. Active note taker and reader.", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80", "9812345678"),
        ("rohan.verma@cuchd.in", hashed, "Rohan Verma", "Chandigarh University", "BBA", "Semester 2", "1st year management student. Need to rent out bicycle and camera for campus events.", "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80", "9898765432"),
        ("ananya.kapoor@cuchd.in", hashed, "Ananya Kapoor", "Chandigarh University", "B.Design (UI/UX)", "Semester 5", "Graphic designer, presentation designer, and digital artist. Freelancing for college clubs & fests.", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80", "9765432109"),
        ("manpreet.kaur@cuchd.in", hashed, "Manpreet Kaur", "Chandigarh University", "MBA", "Semester 3", "Finance major at CU Apex Institute. Selling semester textbooks and offering resume reviews.", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80", "9823456789")
    ]

    cursor.executemany('''
    INSERT INTO users (email, password_hash, full_name, university, course, semester, bio, profile_photo, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', users_seed)

    # Products Seed
    products_seed = [
        (1, "Lenovo IdeaPad Gaming 3 (Ryzen 5 / 16GB / RTX 3050)", 
         "Well-maintained gaming laptop, used for 1 year during engineering labs and gaming. Includes original 135W charger and box. Excellent thermal performance, battery backup ~3.5 hours.",
         42000, "Laptops and Electronics", "sale", "Like New", "CU North Campus, Boys Hostel Block 2", "available", "per day", 0, None),
        
        (3, "Hercules Roadeo 21-Speed Gear Bicycle", 
         "Available for daily or weekly rental. Perfect for commuting from Kharar/Gharuan flats to CU Academic Blocks (Block 1 to Block 9). Front suspension, disc brakes, includes helmet and cable lock.",
         150, "Bicycles and Bikes", "rent", "Gently Used", "Gate 2, Chandigarh University", "available", "per day", 500, "Valid CU ID card required. Return before 9:00 PM if renting daily."),
        
        (2, "Engineering Mathematics 1 & 2 (Higher Engineering Math - B.S. Grewal)", 
         "Essential reference book for 1st and 2nd semester engineering students at CU. All pages intact with clean pencil highlights on key formulas and solved question papers.",
         450, "Books and Study Materials", "sale", "Gently Used", "CU Girls Hostel Block B4", "available", "per day", 0, None),
         
        (3, "Canon EOS 200D II DSLR with 18-55mm & 50mm f/1.8 Lenses", 
         "Rent for campus events, tech fests, fashion shows, or convocation photography. Shoots 4K video, dual-pixel autofocus. Comes with 64GB high speed SD card and dual batteries.",
         600, "Cameras and Photography Equipment", "rent", "Like New", "Hostel Block 1, CU", "available", "per day", 2000, "Security deposit of Rs. 2000 refundable upon safe inspection. Carry CU Student ID."),
        
        (4, "Foldable Bed Study Table with Cup & iPad Holder", 
         "Used for only 1 semester in hostel. High grade MDF wood, ergonomic curve, cup slot and tablet dock. Very sturdy for late night exam study sessions.",
         350, "Hostel and Room Essentials", "sale", "Like New", "Kharar Student Flats, near CU Highway", "available", "per day", 0, None),
         
        (1, "Logitech MX Master 3S Wireless Mouse", 
         "Quiet clicks, 8K DPI sensor, magspeed electromagnetic wheel. Works on any surface. Upgraded to ergonomic vertical mouse, hence selling.",
         4800, "Laptops and Electronics", "sale", "Like New", "Academic Block 3, CU", "available", "per day", 0, None),
         
        (2, "White Board & Marker Set (2x3 Feet) for Exam Prep", 
         "Giving away for free to any junior student preparing for mid-terms or GATE! Good condition.",
         0, "Other Products", "giveaway", "Gently Used", "Girls Hostel B1", "available", "per day", 0, None),
         
        (5, "Nivia Storm Football (Size 5) + Shin Guards", 
         "Used twice at CU Sports Ground. High durability, stitched, matches official FIFA specs.",
         550, "Sports Equipment", "sale", "Like New", "Sports Complex, CU", "available", "per day", 0, None),
         
        (1, "Bajaj 20L Room Cooler with Honeycomb Pads", 
         "Essential for summer semester in hostel or PG in Kharar. High air delivery, castor wheels for easy moving. Kept clean and serviced.",
         2400, "Furniture", "sale", "Gently Used", "Kharar Main Road, PG Zone", "available", "per day", 0, None),
         
        (3, "Scientific Calculator Casio fx-991EX Classwiz", 
         "Allowed in university semester examinations. 552 functions with natural textbook display. New battery inserted.",
         850, "Books and Study Materials", "sale", "Like New", "Block 4 Engineering Dept", "available", "per day", 0, None)
    ]

    cursor.executemany('''
    INSERT INTO products (user_id, title, description, price, category, listing_type, condition, location, status, rent_rate_type, security_deposit, rental_terms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', products_seed)

    # Product Images Seed (Curated high quality Unsplash tech & student essentials)
    product_images_seed = [
        (1, "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80", 1),
        (2, "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80", 1),
        (3, "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80", 1),
        (4, "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80", 1),
        (5, "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80", 1),
        (6, "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80", 1),
        (7, "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80", 1),
        (8, "https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=800&q=80", 1),
        (9, "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80", 1),
        (10, "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=800&q=80", 1)
    ]

    cursor.executemany('''
    INSERT INTO product_images (product_id, image_url, is_primary)
    VALUES (?, ?, ?)
    ''', product_images_seed)

    # Services Seed
    services_seed = [
        (1, "Full Stack Web App Guidance & Code Review (React, Node, Python)",
         "Need help completing your capstone, minor, or major university project? I provide 1-on-1 code mentorship, architecture design, bug fixing, and GitHub setup. Strict focus on academic learning and skill development.",
         "Programming and coding help", 499, "2-3 days",
         "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80"),
         
        (4, "Stunning Presentation & PPT Design for Seminars & Project Defense",
         "Transform your boring bullet points into executive-level slides for your semester evaluations, hackathons, or club pitches. Custom infographics, typography, and animations included.",
         "Presentation and PPT design", 299, "24 hours",
         "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80"),

        (4, "Modern Portfolio & ATS-Friendly Resume Redesign",
         "Stand out in Chandigarh University on-campus placements (T&P department drives). Tailored for IT, product, and core engineering roles with proven ATS formatting.",
         "Resume and portfolio creation", 349, "1-2 days",
         "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80"),

        (3, "Campus Event & Fest Photography / Portrait Sessions",
         "Professional campus photoshoot, farewell portraits, cultural fest coverage, or society events with DSLR cameras and light grading.",
         "Photography", 799, "2 days",
         "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80"),

        (2, "Data Structures & Algorithms 1-on-1 Tutoring (C++ / Java)",
         "Struggling with Trees, Graphs, or Dynamic Programming in your semester exam or placement coding rounds? Personalized tutoring sessions over Google Meet / campus library.",
         "Assignment tutoring and academic assistance", 399, "Hourly",
         "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80")
    ]

    cursor.executemany('''
    INSERT INTO services (user_id, title, description, category, price, delivery_time, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', services_seed)

    # Notes Seed
    notes_seed = [
        (1, "Complete Data Structures & Algorithms Hand-written Notes (CU Syllabus)",
         "Comprehensive hand-written notes covering Array, Linked List, Stack, Queue, Binary Search Trees, AVL, Heaps, Graph Algorithms (Dijkstra, Prim, Kruskal) with solved CU mid-term and end-term questions.",
         "Data Structures & Algorithms", "B.Tech CSE", "Semester 3", "Chandigarh University", 149, 
         "uploads/notes/dsa_cu_notes.pdf", 3, 45),

        (2, "Operating Systems: Process Management, Memory & File Systems",
         "Detailed typed and illustrated notes for CU OS exams. Includes CPU scheduling numericals, Banker's algorithm, Paging, Page replacement algorithms, and Virtual Memory diagrams.",
         "Operating Systems", "B.Tech CSE", "Semester 4", "Chandigarh University", 99, 
         "uploads/notes/os_notes_cu.pdf", 4, 38),

        (5, "Financial Management & Cost Accounting Formulas & Case Studies",
         "Complete study notes for MBA / BBA students at CU. Covers Capital Budgeting, Working Capital Management, Leverage calculations, and solved previous year question patterns.",
         "Financial Management", "MBA / BBA", "Semester 2", "Chandigarh University", 129, 
         "uploads/notes/finance_cu_notes.pdf", 3, 52),

        (2, "Applied Chemistry & Environmental Science Lab Manual + Viva Q&A",
         "First-year university curriculum revision notes. Includes all experimental procedures, calculations, and 100+ recurring viva voice questions.",
         "Applied Chemistry", "All Engineering First Year", "Semester 1", "Chandigarh University", 49, 
         "uploads/notes/chem_firstyear.pdf", 2, 28)
    ]

    cursor.executemany('''
    INSERT INTO notes (user_id, title, description, subject, course, semester, university, price, file_url, preview_pages, total_pages)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', notes_seed)

    # Reviews Seed
    reviews_seed = [
        (2, 1, 5, "Aarav is super helpful! Guided me through my React project error in just 30 minutes. Highly recommended."),
        (3, 4, 5, "Ananya made my hackathon slides look 10x better! Our team won 2nd place at the CU TechFest."),
        (1, 3, 4, "Rented the bicycle for 3 days during exam week. Very smooth ride and great communication.")
    ]

    cursor.executemany('''
    INSERT INTO reviews (reviewer_id, target_user_id, rating, comment)
    VALUES (?, ?, ?, ?)
    ''', reviews_seed)

    # Sample Conversation and Message Seed
    cursor.execute('''
    INSERT INTO conversations (user1_id, user2_id, product_id, updated_at)
    VALUES (2, 1, 1, CURRENT_TIMESTAMP)
    ''')
    conv_id = cursor.lastrowid

    cursor.executemany('''
    INSERT INTO messages (conversation_id, sender_id, text, is_read, created_at)
    VALUES (?, ?, ?, ?, ?)
    ''', [
        (conv_id, 2, "Hey Aarav! Is the Lenovo IdeaPad Gaming laptop still available for inspection?", 1, "2026-11-24 16:30:00"),
        (conv_id, 1, "Hi Priya! Yes, it is. I have the box and charger at Hostel Block 2. You can inspect it anytime after 5 PM today.", 1, "2026-11-24 16:32:00"),
        (conv_id, 2, "Great! Can we meet near Block 3 cafeteria around 5:30 PM?", 0, "2026-11-24 16:45:00")
    ])

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    seed_data()
    print("Database initialized and seeded successfully.")
