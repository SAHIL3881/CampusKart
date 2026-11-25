from fastapi import APIRouter, HTTPException, Depends, Form, UploadFile, File
from fastapi.responses import FileResponse
from typing import Optional
import os
import uuid
import shutil
from server.database import get_db
from server.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/notes", tags=["notes"])

@router.get("")
def list_notes(
    search: Optional[str] = None,
    subject: Optional[str] = None,
    course: Optional[str] = None,
    semester: Optional[str] = None,
    university: Optional[str] = None,
    sort_by: Optional[str] = "newest",
    current_user: Optional[dict] = Depends(get_optional_user)
):
    conn = get_db()
    cursor = conn.cursor()

    query = '''
    SELECT 
        n.*,
        u.full_name as uploader_name,
        u.university as uploader_university,
        u.course as uploader_course,
        u.semester as uploader_semester,
        u.profile_photo as uploader_photo,
        (SELECT COUNT(*) FROM note_purchases WHERE note_id = n.id) as purchase_count
    '''

    if current_user:
        query += ''',
        EXISTS(SELECT 1 FROM saved_items WHERE user_id = ? AND item_type = 'note' AND item_id = n.id) as is_saved,
        EXISTS(SELECT 1 FROM note_purchases WHERE user_id = ? AND note_id = n.id) as is_purchased
        '''
        params = [current_user["id"], current_user["id"]]
    else:
        query += ''',
        0 as is_saved,
        0 as is_purchased
        '''
        params = []

    query += '''
    FROM notes n
    JOIN users u ON n.user_id = u.id
    WHERE n.status = 'available'
    '''

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query += " AND (LOWER(n.title) LIKE ? OR LOWER(n.description) LIKE ? OR LOWER(n.subject) LIKE ? OR LOWER(n.course) LIKE ?)"
        params.extend([term, term, term, term])

    if subject and subject.lower() != "all":
        query += " AND LOWER(n.subject) = ?"
        params.append(subject.lower())

    if course and course.lower() != "all":
        query += " AND LOWER(n.course) = ?"
        params.append(course.lower())

    if semester and semester.lower() != "all":
        query += " AND LOWER(n.semester) = ?"
        params.append(semester.lower())

    if university and university.lower() != "all":
        query += " AND LOWER(n.university) = ?"
        params.append(university.lower())

    if sort_by == "price_asc":
        query += " ORDER BY n.price ASC"
    elif sort_by == "price_desc":
        query += " ORDER BY n.price DESC"
    else:
        query += " ORDER BY n.created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    notes = [dict(r) for r in rows]
    conn.close()

    return {"success": True, "count": len(notes), "notes": notes}

@router.get("/{note_id}")
def get_note(note_id: int, current_user: Optional[dict] = Depends(get_optional_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT 
        n.*,
        u.id as uploader_id,
        u.full_name as uploader_name,
        u.email as uploader_email,
        u.university as uploader_university,
        u.course as uploader_course,
        u.semester as uploader_semester,
        u.profile_photo as uploader_photo
    FROM notes n
    JOIN users u ON n.user_id = u.id
    WHERE n.id = ?
    ''', (note_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Notes not found")

    note = dict(row)

    if current_user:
        cursor.execute("SELECT 1 FROM saved_items WHERE user_id = ? AND item_type = 'note' AND item_id = ?", (current_user["id"], note_id))
        note["is_saved"] = bool(cursor.fetchone())
        
        cursor.execute("SELECT 1 FROM note_purchases WHERE user_id = ? AND note_id = ?", (current_user["id"], note_id))
        note["is_purchased"] = bool(cursor.fetchone()) or (current_user["id"] == note["user_id"])
    else:
        note["is_saved"] = False
        note["is_purchased"] = False

    conn.close()
    return {"success": True, "note": note}

@router.post("")
async def upload_notes(
    title: str = Form(...),
    description: str = Form(...),
    subject: str = Form(...),
    course: str = Form(...),
    semester: str = Form(...),
    price: float = Form(0.0),
    preview_pages: int = Form(3),
    total_pages: int = Form(10),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    os.makedirs("uploads/notes", exist_ok=True)
    file_path = "uploads/notes/sample_study_material.pdf"

    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext != ".pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are supported for notes upload")
        saved_filename = f"{uuid.uuid4().hex}.pdf"
        dest = os.path.join("uploads", "notes", saved_filename)
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_path = f"uploads/notes/{saved_filename}"

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    INSERT INTO notes (
        user_id, title, description, subject, course, semester, 
        university, price, file_url, preview_pages, total_pages, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
    ''', (
        current_user["id"],
        title.strip(),
        description.strip(),
        subject.strip(),
        course.strip(),
        semester.strip(),
        current_user.get("university", "Chandigarh University"),
        float(price),
        file_path,
        int(preview_pages),
        int(total_pages)
    ))
    note_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
    note = dict(cursor.fetchone())
    conn.close()

    return {"success": True, "note": note, "message": "Study notes published to marketplace successfully"}

@router.post("/{note_id}/purchase")
def purchase_note(note_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
    note = cursor.fetchone()
    if not note:
        conn.close()
        raise HTTPException(status_code=404, detail="Notes not found")

    if note["user_id"] == current_user["id"]:
        conn.close()
        return {"success": True, "message": "You are the author of these notes. Full access is already granted."}

    cursor.execute("SELECT id FROM note_purchases WHERE user_id = ? AND note_id = ?", (current_user["id"], note_id))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return {"success": True, "message": "You have already purchased and unlocked these notes."}

    tx_id = f"PAY-CU-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute('''
    INSERT INTO note_purchases (user_id, note_id, amount_paid, transaction_id)
    VALUES (?, ?, ?, ?)
    ''', (current_user["id"], note_id, note["price"], tx_id))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "transaction_id": tx_id,
        "amount": note["price"],
        "message": f"Payment of ₹{note['price']} successful! Notes are now unlocked in your dashboard."
    }

@router.get("/{note_id}/download")
def download_note(note_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
    note = cursor.fetchone()
    if not note:
        conn.close()
        raise HTTPException(status_code=404, detail="Note not found")

    is_author = note["user_id"] == current_user["id"]
    cursor.execute("SELECT id FROM note_purchases WHERE user_id = ? AND note_id = ?", (current_user["id"], note_id))
    purchased = bool(cursor.fetchone())
    conn.close()

    if not is_author and not purchased and note["price"] > 0:
        raise HTTPException(status_code=403, detail="Please purchase these notes to download the full PDF")

    # If file exists on disk return it, otherwise provide demo PDF buffer
    file_path = note["file_url"]
    if not os.path.exists(file_path):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(b"%PDF-1.4\n% Campus Kart Study Notes\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000030 00000 n\n0000000079 00000 n\n00000000133 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n218\n%%EOF")

    clean_filename = f"{note['title'].replace(' ', '_')[:30]}.pdf"
    return FileResponse(file_path, media_type="application/pdf", filename=clean_filename)

@router.delete("/{note_id}")
def delete_note(note_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT user_id FROM notes WHERE id = ?", (note_id,))
    n = cursor.fetchone()
    if not n:
        conn.close()
        raise HTTPException(status_code=404, detail="Notes not found")

    if n["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="You can only delete your own notes")

    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Notes deleted successfully"}
