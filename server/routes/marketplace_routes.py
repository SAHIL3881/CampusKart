from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from typing import Optional, List
import os
import uuid
import shutil
from server.database import get_db
from server.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/products", tags=["marketplace"])

@router.get("")
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    listing_type: Optional[str] = None,
    condition: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    university: Optional[str] = None,
    status: Optional[str] = "available",
    sort_by: Optional[str] = "newest",
    current_user: Optional[dict] = Depends(get_optional_user)
):
    conn = get_db()
    cursor = conn.cursor()

    query = '''
    SELECT 
        p.*,
        u.full_name as seller_name,
        u.university as seller_university,
        u.profile_photo as seller_photo,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image,
        (SELECT COUNT(*) FROM saved_items WHERE item_type = 'product' AND item_id = p.id) as save_count
    '''
    
    if current_user:
        query += ''',
        EXISTS(SELECT 1 FROM saved_items WHERE user_id = ? AND item_type = 'product' AND item_id = p.id) as is_saved
        '''
        params = [current_user["id"]]
    else:
        query += ''',
        0 as is_saved
        '''
        params = []

    query += '''
    FROM products p
    JOIN users u ON p.user_id = u.id
    WHERE 1=1
    '''

    if status and status != "all":
        query += " AND p.status = ?"
        params.append(status)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query += " AND (LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.category) LIKE ? OR LOWER(p.location) LIKE ?)"
        params.extend([term, term, term, term])

    if category and category.lower() != "all":
        query += " AND p.category = ?"
        params.append(category)

    if listing_type and listing_type.lower() != "all":
        query += " AND p.listing_type = ?"
        params.append(listing_type.lower())

    if condition and condition.lower() != "all":
        query += " AND p.condition = ?"
        params.append(condition)

    if min_price is not None:
        query += " AND p.price >= ?"
        params.append(min_price)

    if max_price is not None:
        query += " AND p.price <= ?"
        params.append(max_price)

    if university and university.lower() != "all":
        query += " AND u.university = ?"
        params.append(university)

    # Sorting
    if sort_by == "price_asc":
        query += " ORDER BY p.price ASC"
    elif sort_by == "price_desc":
        query += " ORDER BY p.price DESC"
    elif sort_by == "oldest":
        query += " ORDER BY p.created_at ASC"
    else:
        query += " ORDER BY p.created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    products = [dict(r) for r in rows]
    conn.close()

    return {
        "success": True,
        "count": len(products),
        "products": products
    }

@router.get("/{product_id}")
def get_product(product_id: int, current_user: Optional[dict] = Depends(get_optional_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT 
        p.*,
        u.id as seller_id,
        u.full_name as seller_name,
        u.email as seller_email,
        u.university as seller_university,
        u.course as seller_course,
        u.semester as seller_semester,
        u.profile_photo as seller_photo,
        u.phone as seller_phone
    FROM products p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
    ''', (product_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    product = dict(row)

    # Fetch all images
    cursor.execute("SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC", (product_id,))
    product["images"] = [dict(img) for img in cursor.fetchall()]

    # Check is_saved
    if current_user:
        cursor.execute("SELECT 1 FROM saved_items WHERE user_id = ? AND item_type = 'product' AND item_id = ?", (current_user["id"], product_id))
        product["is_saved"] = bool(cursor.fetchone())
    else:
        product["is_saved"] = False

    # Fetch seller reviews count & avg rating
    cursor.execute("SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE target_user_id = ?", (product["user_id"],))
    rev_data = cursor.fetchone()
    product["seller_rating"] = round(rev_data["avg_rating"], 1) if rev_data["avg_rating"] else 5.0
    product["seller_review_count"] = rev_data["count"]

    # Fetch related products
    cursor.execute('''
    SELECT p.id, p.title, p.price, p.listing_type, p.condition,
           (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
    FROM products p
    WHERE p.category = ? AND p.id != ? AND p.status = 'available'
    LIMIT 4
    ''', (product["category"], product_id))
    product["related"] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "success": True,
        "product": product
    }

@router.post("")
def create_product(
    title: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    category: str = Form(...),
    listing_type: str = Form("sale"),
    condition: str = Form("Gently Used"),
    location: str = Form(...),
    rent_rate_type: Optional[str] = Form("per day"),
    security_deposit: Optional[float] = Form(0.0),
    rental_terms: Optional[str] = Form(None),
    image_urls: Optional[str] = Form(None), # Comma separated image urls if provided
    current_user: dict = Depends(get_current_user)
):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    INSERT INTO products (
        user_id, title, description, price, category, listing_type, 
        condition, location, rent_rate_type, security_deposit, rental_terms, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
    ''', (
        current_user["id"],
        title.strip(),
        description.strip(),
        float(price),
        category.strip(),
        listing_type.strip().lower(),
        condition.strip(),
        location.strip(),
        rent_rate_type or "per day",
        float(security_deposit or 0.0),
        rental_terms or None
    ))
    product_id = cursor.lastrowid

    # Handle image URLs or placeholder
    images = []
    if image_urls:
        urls = [u.strip() for u in image_urls.split(",") if u.strip()]
        for i, u in enumerate(urls):
            images.append((product_id, u, 1 if i == 0 else 0))
    
    if not images:
        default_img = "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80"
        images.append((product_id, default_img, 1))

    cursor.executemany("INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)", images)
    conn.commit()

    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    product = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "product": product,
        "message": "Product listing created successfully"
    }

@router.put("/{product_id}")
def update_product(
    product_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    listing_type: Optional[str] = Form(None),
    condition: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    rent_rate_type: Optional[str] = Form(None),
    security_deposit: Optional[float] = Form(None),
    rental_terms: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    image_urls: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT user_id FROM products WHERE id = ?", (product_id,))
    prod = cursor.fetchone()
    if not prod:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    if prod["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="You can only edit your own listings")

    updates = []
    params = []

    if title is not None:
        updates.append("title = ?")
        params.append(title.strip())
    if description is not None:
        updates.append("description = ?")
        params.append(description.strip())
    if price is not None:
        updates.append("price = ?")
        params.append(float(price))
    if category is not None:
        updates.append("category = ?")
        params.append(category.strip())
    if listing_type is not None:
        updates.append("listing_type = ?")
        params.append(listing_type.strip().lower())
    if condition is not None:
        updates.append("condition = ?")
        params.append(condition.strip())
    if location is not None:
        updates.append("location = ?")
        params.append(location.strip())
    if rent_rate_type is not None:
        updates.append("rent_rate_type = ?")
        params.append(rent_rate_type.strip())
    if security_deposit is not None:
        updates.append("security_deposit = ?")
        params.append(float(security_deposit))
    if rental_terms is not None:
        updates.append("rental_terms = ?")
        params.append(rental_terms.strip())
    if status is not None:
        updates.append("status = ?")
        params.append(status.strip())

    if updates:
        params.append(product_id)
        cursor.execute(f"UPDATE products SET {', '.join(updates)} WHERE id = ?", params)

    if image_urls is not None:
        urls = [u.strip() for u in image_urls.split(",") if u.strip()]
        if urls:
            cursor.execute("DELETE FROM product_images WHERE product_id = ?", (product_id,))
            imgs = [(product_id, u, 1 if i == 0 else 0) for i, u in enumerate(urls)]
            cursor.executemany("INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)", imgs)

    conn.commit()
    conn.close()

    return {"success": True, "message": "Product listing updated successfully"}

@router.patch("/{product_id}/status")
def update_product_status(product_id: int, status: str = Form(...), current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT user_id FROM products WHERE id = ?", (product_id,))
    prod = cursor.fetchone()
    if not prod:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    if prod["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="You can only manage your own listings")

    valid_statuses = ["available", "rented", "sold", "unavailable"]
    if status not in valid_statuses:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from {valid_statuses}")

    cursor.execute("UPDATE products SET status = ? WHERE id = ?", (status, product_id))
    conn.commit()
    conn.close()

    return {"success": True, "message": f"Product status updated to '{status}'"}

@router.delete("/{product_id}")
def delete_product(product_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT user_id FROM products WHERE id = ?", (product_id,))
    prod = cursor.fetchone()
    if not prod:
        conn.close()
        raise HTTPException(status_code=404, detail="Product not found")

    if prod["user_id"] != current_user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="You can only delete your own listings")

    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Product deleted successfully"}

@router.post("/{product_id}/save")
def toggle_save_product(product_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM saved_items WHERE user_id = ? AND item_type = 'product' AND item_id = ?", (current_user["id"], product_id))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("DELETE FROM saved_items WHERE id = ?", (existing["id"],))
        saved = False
        msg = "Product removed from saved items"
    else:
        cursor.execute("INSERT INTO saved_items (user_id, item_type, item_id) VALUES (?, 'product', ?)", (current_user["id"], product_id))
        saved = True
        msg = "Product added to saved items"

    conn.commit()
    conn.close()

    return {"success": True, "saved": saved, "message": msg}

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, or GIF image files are allowed")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("uploads", "products", filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "success": True,
        "image_url": f"/uploads/products/{filename}"
    }
