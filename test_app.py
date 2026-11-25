import sys
import os
import json
from fastapi.testclient import TestClient

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath("."))

from server.main import app
from server.database import init_db, seed_data

def run_all_tests():
    print("=" * 60)
    print("CAMPUS KART — AUTOMATED TEST SUITE")
    print("=" * 60)

    # 1. DB Init
    print("[1] Initializing and verifying database...")
    init_db()
    seed_data()
    client = TestClient(app)
    print("    ✓ Database initialized and seeded")

    # 2. Auth: Login existing seed user
    print("\n[2] Testing Authentication...")
    login_resp = client.post("/api/auth/login", json={
        "email": "arav.sharma@cuchd.in",
        "password": "cu123456"
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    auth_data = login_resp.json()
    token = auth_data["token"]
    user = auth_data["user"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"    ✓ Logged in as: {user['full_name']} ({user['email']})")

    # Register a new student
    new_email = f"sahil.patel.{os.getpid()}@cuchd.in"
    reg_resp = client.post("/api/auth/register", json={
        "full_name": "Sahil Patel",
        "email": new_email,
        "password": "password123",
        "university": "Chandigarh University",
        "course": "B.Tech Computer Science",
        "semester": "Semester 6",
        "phone": "9876500000"
    })
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    new_user_data = reg_resp.json()
    new_token = new_user_data["token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}
    print(f"    ✓ Registered new student: {new_user_data['user']['full_name']}")

    # 3. Marketplace: Products
    print("\n[3] Testing Marketplace Endpoints...")
    # List products
    prod_resp = client.get("/api/products")
    assert prod_resp.status_code == 200
    products = prod_resp.json()["products"]
    assert len(products) > 0
    print(f"    ✓ Listed {len(products)} products")

    # Filter products by category
    filter_resp = client.get("/api/products?category=Laptops and Electronics")
    assert filter_resp.status_code == 200
    electronics = filter_resp.json()["products"]
    assert all(p["category"] == "Laptops and Electronics" for p in electronics)
    print(f"    ✓ Category filter verified ({len(electronics)} electronics found)")

    # Filter by rental
    rent_resp = client.get("/api/products?listing_type=rent")
    assert rent_resp.status_code == 200
    rentals = rent_resp.json()["products"]
    assert all(p["listing_type"] == "rent" for p in rentals)
    print(f"    ✓ Rental filter verified ({len(rentals)} rentals found)")

    # Create a product listing
    create_prod_resp = client.post("/api/products", data={
        "title": "Lab Coat & Safety Goggles (Size L)",
        "description": "Used for 1st semester Chemistry Lab at CU Block 1. Clean condition, no tears.",
        "price": 250,
        "category": "Hostel and Room Essentials",
        "listing_type": "sale",
        "condition": "Like New",
        "location": "Girls Hostel B2, CU",
        "image_urls": "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=800&q=80"
    }, headers=new_headers)
    if create_prod_resp.status_code != 200:
        print("Create product error:", create_prod_resp.status_code, create_prod_resp.text)
    assert create_prod_resp.status_code == 200
    new_prod_id = create_prod_resp.json()["product"]["id"]
    print(f"    ✓ Created new product listing ID: {new_prod_id}")

    # Toggle Save Product
    save_resp = client.post(f"/api/products/{new_prod_id}/save", headers=headers)
    assert save_resp.status_code == 200
    assert save_resp.json()["saved"] is True
    print(f"    ✓ Saved item functionality verified")

    # Update Product Status
    status_resp = client.patch(f"/api/products/{new_prod_id}/status", data={"status": "sold"}, headers=new_headers)
    assert status_resp.status_code == 200
    print(f"    ✓ Product status updated to 'sold'")

    # 4. Student Services
    print("\n[4] Testing Student Services...")
    serv_resp = client.get("/api/services")
    assert serv_resp.status_code == 200
    services = serv_resp.json()["services"]
    assert len(services) > 0
    print(f"    ✓ Listed {len(services)} services")

    create_serv_resp = client.post("/api/services", data={
        "title": "React & Tailwind CSS Frontend Mentorship",
        "description": "1-on-1 guidance for semester project frontends. Code reviews and clean architecture.",
        "category": "Programming and coding help",
        "price": 399,
        "delivery_time": "1-2 days"
    }, headers=new_headers)
    assert create_serv_resp.status_code == 200
    print(f"    ✓ Published new student service")

    # 5. Notes Marketplace
    print("\n[5] Testing Notes Marketplace...")
    notes_resp = client.get("/api/notes")
    assert notes_resp.status_code == 200
    notes = notes_resp.json()["notes"]
    assert len(notes) > 0
    print(f"    ✓ Listed {len(notes)} study notes")

    # Purchase notes (by new student)
    target_note = notes[0]
    purchase_resp = client.post(f"/api/notes/{target_note['id']}/purchase", headers=new_headers)
    assert purchase_resp.status_code == 200
    print(f"    ✓ Simulated instant note unlock/purchase: Tx ID {purchase_resp.json().get('transaction_id')}")

    # 6. Real-Time Chat Endpoints
    print("\n[6] Testing Chat & Messaging...")
    start_chat_resp = client.post("/api/chat/start", json={
        "recipient_id": user["id"],
        "product_id": target_note["id"],
        "initial_message": "Hi Aarav! Is your listing available?"
    }, headers=new_headers)
    assert start_chat_resp.status_code == 200
    conv_id = start_chat_resp.json()["conversation_id"]
    print(f"    ✓ Conversation started with ID: {conv_id}")

    # Send follow-up message
    msg_resp = client.post("/api/chat/messages", json={
        "conversation_id": conv_id,
        "text": "Can we meet at Academic Block 3 cafeteria?"
    }, headers=new_headers)
    assert msg_resp.status_code == 200
    print(f"    ✓ Message sent successfully")

    # Fetch messages
    msgs_resp = client.get(f"/api/chat/conversations/{conv_id}/messages", headers=headers)
    assert msgs_resp.status_code == 200
    msgs = msgs_resp.json()["messages"]
    assert len(msgs) >= 2
    print(f"    ✓ Message history verified ({len(msgs)} messages retrieved)")

    # 7. Dashboard Endpoints
    print("\n[7] Testing Dashboard Summary...")
    dash_resp = client.get("/api/dashboard/summary", headers=new_headers)
    assert dash_resp.status_code == 200
    counts = dash_resp.json()["counts"]
    print(f"    ✓ Dashboard summary verified: {counts}")

    # 8. Web App Index HTML
    print("\n[8] Testing Frontend File Serving...")
    index_resp = client.get("/")
    assert index_resp.status_code == 200
    assert "Campus Kart" in index_resp.text
    print("    ✓ Single Page Application index.html serves cleanly")

    css_resp = client.get("/static/css/styles.css")
    assert css_resp.status_code == 200
    assert "--primary-blue" in css_resp.text
    print("    ✓ CSS styles served cleanly")

    print("\n" + "=" * 60)
    print("🎉 ALL TESTS PASSED! CAMPUS KART IS FULLY OPERATIONAL.")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()
