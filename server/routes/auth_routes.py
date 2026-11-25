from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from server.database import get_db
from server.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    university: Optional[str] = "Chandigarh University"
    course: Optional[str] = ""
    semester: Optional[str] = ""
    bio: Optional[str] = ""
    phone: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    course: Optional[str] = None
    semester: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    university: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str

@router.post("/register")
def register(req: RegisterRequest):
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email address is required")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    hashed = hash_password(req.password)
    default_photo = f"https://api.dicebear.com/7.x/initials/svg?seed={req.full_name}"

    cursor.execute('''
    INSERT INTO users (email, password_hash, full_name, university, course, semester, bio, phone, profile_photo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        email,
        hashed,
        req.full_name.strip(),
        req.university or "Chandigarh University",
        req.course or "",
        req.semester or "",
        req.bio or f"Student at {req.university or 'Chandigarh University'}",
        req.phone or "",
        default_photo
    ))
    user_id = cursor.lastrowid
    conn.commit()

    token = create_access_token({"sub": user_id, "email": email})
    cursor.execute("SELECT id, email, full_name, university, course, semester, bio, phone, profile_photo, created_at FROM users WHERE id = ?", (user_id,))
    user = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "token": token,
        "user": user,
        "message": "Account created successfully"
    }

@router.post("/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, email, password_hash, full_name, university, course, semester, bio, phone, profile_photo, created_at FROM users WHERE LOWER(email) = ?", (email,))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row or not verify_password(req.password, user_row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = dict(user_row)
    del user["password_hash"]

    token = create_access_token({"sub": user["id"], "email": user["email"]})

    return {
        "success": True,
        "token": token,
        "user": user,
        "message": "Logged in successfully"
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "user": current_user
    }

@router.put("/profile")
def update_profile(req: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    updates = []
    params = []

    if req.full_name is not None:
        updates.append("full_name = ?")
        params.append(req.full_name.strip())
    if req.course is not None:
        updates.append("course = ?")
        params.append(req.course.strip())
    if req.semester is not None:
        updates.append("semester = ?")
        params.append(req.semester.strip())
    if req.bio is not None:
        updates.append("bio = ?")
        params.append(req.bio.strip())
    if req.phone is not None:
        updates.append("phone = ?")
        params.append(req.phone.strip())
    if req.profile_photo is not None:
        updates.append("profile_photo = ?")
        params.append(req.profile_photo)
    if req.university is not None:
        updates.append("university = ?")
        params.append(req.university.strip())

    if updates:
        params.append(current_user["id"])
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

    cursor.execute("SELECT id, email, full_name, university, course, semester, bio, phone, profile_photo, created_at FROM users WHERE id = ?", (current_user["id"],))
    updated_user = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "user": updated_user,
        "message": "Profile updated successfully"
    }

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    email = req.email.strip().lower()
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="No student found with this email address")

    hashed = hash_password(req.new_password)
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hashed, user["id"]))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "Password reset successful. You may now log in with your new password."
    }

@router.get("/users/{user_id}")
def get_user_profile(user_id: int):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, email, full_name, university, course, semester, bio, phone, profile_photo, created_at FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    user_dict = dict(user)

    # Fetch products
    cursor.execute('''
    SELECT p.*, (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
    FROM products p WHERE p.user_id = ? ORDER BY p.created_at DESC
    ''', (user_id,))
    products = [dict(r) for r in cursor.fetchall()]

    # Fetch services
    cursor.execute("SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    services = [dict(r) for r in cursor.fetchall()]

    # Fetch notes
    cursor.execute("SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    notes = [dict(r) for r in cursor.fetchall()]

    # Fetch reviews
    cursor.execute('''
    SELECT r.*, u.full_name as reviewer_name, u.profile_photo as reviewer_photo
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.target_user_id = ?
    ORDER BY r.created_at DESC
    ''', (user_id,))
    reviews = [dict(r) for r in cursor.fetchall()]

    avg_rating = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 5.0

    conn.close()
    return {
        "success": True,
        "user": user_dict,
        "products": products,
        "services": services,
        "notes": notes,
        "reviews": reviews,
        "rating": round(avg_rating, 1),
        "review_count": len(reviews)
    }
