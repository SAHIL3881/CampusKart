#!/usr/bin/env python3
"""
Campus Kart — Chandigarh University Student Marketplace & Services Platform
Entry point to run the platform locally.
"""

import os
import sys
import uvicorn
from server.database import init_db, seed_data

def main():
    print("=" * 65)
    print("   🎓 CAMPUS KART — STUDENT MARKETPLACE & SERVICES PLATFORM")
    print("   Focused on Chandigarh University (Gharuan, Mohali)")
    print("=" * 65)

    # Initialize SQLite database and populate Chandigarh University seed data
    print("\n[1/2] Initializing database & campus seed records...")
    init_db()
    seed_data()
    print("      ✓ Database ready (campus_kart.db)")
    print("      ✓ Verified CU test accounts & listings loaded")

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")

    print(f"\n[2/2] Starting server at: http://{host}:{port}")
    print("      Press Ctrl+C to stop the server at any time.\n")
    print("=" * 65)

    uvicorn.run("server.main:app", host=host, port=port, reload=True)

if __name__ == "__main__":
    main()
