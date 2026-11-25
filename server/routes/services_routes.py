from fastapi import APIRouter, HTTPException, Depends, Form, UploadFile, File
from typing import Optional
import os
import uuid
import shutil
from server.database import get_db
from server.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/services", tags=["services"])

@router.get("")
def list_services(
    search: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: Optional[str] = "newest",
    current_user: Optional[dict] = Depends(get_optional_user)
):
    conn = get_db()
    cursor = conn.cursor()

    query = '''
    SELECT 
        s.*,
        u.full_name as provider_name,
        u.university as provider_university,
        u.course as provider_course,
        u.semester as provider_semester,
        u.profile_photo as provider_photo,
        (SELECT AVG(rating) FROM reviews WHERE target_user_id = s.user_id) as provider_rating,
        (SELECT COUNT(*) FROM reviews WHERE target_user_id = s.user_id) as provider_review_count
    '''

    if current_user:
        query += ''',
        EXISTS(SELECT 1 FROM saved_items WHERE user_id = ? AND item_type = 'service' AND item_id = s.id) as is_saved
        '''
        params = [current_user["id"]]
    else:
        query += ''',
        0 as is_saved
        '''
        params = []

    query += '''
    FROM services s
    JOIN users u ON s.user_id = u.id
    WHERE s.status = 'active'
    '''

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query += " AND (LOWER(s.title) LIKE ? OR LOWER(s.description) LIKE ? OR LOWER(s.category) LIKE ?)"
        params.extend([term, term, term])

    if category and category.lower() != "all":
        query += " AND s.category = ?"
        params.append(category)

    if sort_by == "price_asc":
        query += " ORDER BY s.price ASC"
    elif sort_by == "price_desc":
        query += " ORDER BY s.price DESC"
    else:
        query += " ORDER BY s.created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    services = []
    for r in rows:
        d = dict(r)
        d["provider_rating"] = round(d["provider_rating"], 1) if d["provider_rating"] else 5.0
        services.append(d)

    conn.close()
    return {"success": True, "count": len(services), "services": services}

@router.get("/{service_id}")
def get_service(service_id: int, current_user: Optional[dict] = Depends(get_optional_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT 
        s.*,
        u.id as provider_id,
        u.full_name as provider_name,
        u.email as provider_email,
        u.university as provider_university,
        u.course as provider_course,
        u.semester as provider_semester,
        u.profile_photo as provider_photo,
        u.phone as provider_phone,
        u.bio as provider_bio
    FROM services s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
    ''', (service_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Service not found")

    service = dict(row)

    if current_user:
        cursor.execute("SELECT 1 FROM saved_items WHERE user_id = ? AND item_type = 'service' AND item_id = ?", (current_user["id"], service_id))
        service["is_saved"] = bool(cursor.fetchone())
    else:
        service["is_saved"] = False

    cursor.execute('''
    SELECT r.*, u.full_name as reviewer_name, u.profile_photo as reviewer_photo
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.target_user_id = ?
    ORDER BY r.created_at DESC
    ''', (service["user_id"],))
    service["reviews"] = [dict(r) for r in cursor.fetchall()]
    service["provider_rating"] = round(sum(r["rating"] for r in service["reviews"]) / len(service["reviews"]), 1) if service["reviews"] else 5.0

    conn.close()
    return {"success": True, "service": service}

@router.post("")
def create_service(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    price: float = Form(...),
    delivery_time: str = Form(...),
    image_url: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    conn = get_db()
    cursor = conn.cursor()

    default_img = image_url or "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"

    cursor.execute('''
    INSERT INTO services (user_id, title, description, category, price, delivery_time, image_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    ''', (
        current_user["id"],
        title.strip(),
        description.strip(),
        category.strip(),
        float(price),
        delivery_time.strip(),
        default_img
    ))
    service_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM services WHERE id = ?", (service_id,))
    service = dict(cursor.fetchone())
    conn.close()

    return {"success": True, "service": service, "message": "Service listing published successfully"}

@router.delete("/{service_id}")
def delete_service(service_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT user_id FROM services WHERE id = ?", (service_id,))
    s = cursor.fetchone()
    if not s:
        conn.close()
        raise HTTPException(status_code=404, detail="Service not found")

    if s["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="You can only delete your own services")

    cursor.execute("DELETE FROM services WHERE id = ?", (service_id,))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Service deleted successfully"}

@router.post("/{service_id}/save")
def toggle_save_service(service_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM saved_items WHERE user_id = ? AND item_type = 'service' AND item_id = ?", (current_user["id"], service_id))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("DELETE FROM saved_items WHERE id = ?", (existing["id"],))
        saved = False
        msg = "Service removed from saved items"
    else:
        cursor.execute("INSERT INTO saved_items (user_id, item_type, item_id) VALUES (?, 'service', ?)", (current_user["id"], service_id))
        saved = True
        msg = "Service added to saved items"

    conn.commit()
    conn.close()

    return {"success": True, "saved": saved, "message": msg}
