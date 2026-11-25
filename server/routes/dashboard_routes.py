from fastapi import APIRouter, Depends
from server.database import get_db
from server.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    cursor = conn.cursor()

    # Product counts
    cursor.execute("SELECT COUNT(*) FROM products WHERE user_id = ?", (user_id,))
    total_products = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM products WHERE user_id = ? AND listing_type = 'rent'", (user_id,))
    total_rentals = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM services WHERE user_id = ?", (user_id,))
    total_services = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM notes WHERE user_id = ?", (user_id,))
    total_notes = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM saved_items WHERE user_id = ?", (user_id,))
    total_saved = cursor.fetchone()[0]

    cursor.execute('''
    SELECT COUNT(*) 
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE (c.user1_id = ? OR c.user2_id = ?) AND m.sender_id != ? AND m.is_read = 0
    ''', (user_id, user_id, user_id))
    unread_messages = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM note_purchases WHERE user_id = ?", (user_id,))
    purchased_notes_count = cursor.fetchone()[0]

    conn.close()

    return {
        "success": True,
        "counts": {
            "products": total_products,
            "rentals": total_rentals,
            "services": total_services,
            "notes": total_notes,
            "saved": total_saved,
            "unread_chats": unread_messages,
            "purchased_notes": purchased_notes_count
        }
    }

@router.get("/my-listings")
def get_my_listings(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT 
        p.*,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image,
        (SELECT COUNT(*) FROM saved_items WHERE item_type = 'product' AND item_id = p.id) as save_count
    FROM products p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    ''', (user_id,))
    products = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {"success": True, "products": products}

@router.get("/my-services")
def get_my_services(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    services = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {"success": True, "services": services}

@router.get("/my-notes")
def get_my_notes(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT 
        n.*,
        (SELECT COUNT(*) FROM note_purchases WHERE note_id = n.id) as purchases_count,
        (SELECT SUM(amount_paid) FROM note_purchases WHERE note_id = n.id) as total_earnings
    FROM notes n
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    ''', (user_id,))
    notes = []
    for r in cursor.fetchall():
        d = dict(r)
        d["total_earnings"] = d["total_earnings"] or 0.0
        notes.append(d)

    conn.close()
    return {"success": True, "notes": notes}

@router.get("/saved-items")
def get_saved_items(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    cursor = conn.cursor()

    # Saved products
    cursor.execute('''
    SELECT p.*, 'product' as item_type,
           (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as primary_image,
           u.full_name as seller_name
    FROM saved_items s
    JOIN products p ON s.item_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE s.user_id = ? AND s.item_type = 'product'
    ORDER BY s.created_at DESC
    ''', (user_id,))
    saved_products = [dict(r) for r in cursor.fetchall()]

    # Saved services
    cursor.execute('''
    SELECT s.*, 'service' as item_type, u.full_name as provider_name
    FROM saved_items si
    JOIN services s ON si.item_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE si.user_id = ? AND si.item_type = 'service'
    ORDER BY si.created_at DESC
    ''', (user_id,))
    saved_services = [dict(r) for r in cursor.fetchall()]

    # Saved notes
    cursor.execute('''
    SELECT n.*, 'note' as item_type, u.full_name as uploader_name
    FROM saved_items si
    JOIN notes n ON si.item_id = n.id
    JOIN users u ON n.user_id = u.id
    WHERE si.user_id = ? AND si.item_type = 'note'
    ORDER BY si.created_at DESC
    ''', (user_id,))
    saved_notes = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {
        "success": True,
        "saved_products": saved_products,
        "saved_services": saved_services,
        "saved_notes": saved_notes
    }

@router.get("/purchased-notes")
def get_purchased_notes(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT 
        n.*,
        np.amount_paid,
        np.transaction_id,
        np.created_at as purchased_at,
        u.full_name as uploader_name,
        u.university as uploader_university
    FROM note_purchases np
    JOIN notes n ON np.note_id = n.id
    JOIN users u ON n.user_id = u.id
    WHERE np.user_id = ?
    ORDER BY np.created_at DESC
    ''', (user_id,))
    notes = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return {"success": True, "purchased_notes": notes}
