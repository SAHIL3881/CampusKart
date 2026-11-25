from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from server.database import get_db
from server.auth import get_current_user
from server.websocket_manager import ws_manager

router = APIRouter(prefix="/api/chat", tags=["chat"])

class StartConversationRequest(BaseModel):
    recipient_id: int
    product_id: Optional[int] = None
    service_id: Optional[int] = None
    initial_message: Optional[str] = None

class SendMessageRequest(BaseModel):
    conversation_id: int
    text: str

@router.get("/conversations")
def get_conversations(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT 
        c.id as conversation_id,
        c.updated_at,
        c.product_id,
        c.service_id,
        CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END as other_user_id,
        u.full_name as other_user_name,
        u.profile_photo as other_user_photo,
        u.university as other_user_university,
        (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) as unread_count,
        p.title as product_title,
        p.price as product_price,
        (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as product_image,
        s.title as service_title
    FROM conversations c
    JOIN users u ON u.id = (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END)
    LEFT JOIN products p ON c.product_id = p.id
    LEFT JOIN services s ON c.service_id = s.id
    WHERE c.user1_id = ? OR c.user2_id = ?
    ORDER BY c.updated_at DESC
    ''', (user_id, user_id, user_id, user_id, user_id))

    rows = cursor.fetchall()
    conversations = [dict(r) for r in rows]
    conn.close()

    return {"success": True, "conversations": conversations}

@router.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    cursor = conn.cursor()

    # Check participant
    cursor.execute("SELECT user1_id, user2_id, product_id, service_id FROM conversations WHERE id = ?", (conversation_id,))
    conv = cursor.fetchone()
    if not conv or (conv["user1_id"] != user_id and conv["user2_id"] != user_id):
        conn.close()
        raise HTTPException(status_code=403, detail="You do not have access to this conversation")

    # Mark incoming messages as read
    cursor.execute("UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?", (conversation_id, user_id))
    conn.commit()

    cursor.execute('''
    SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.text,
        m.is_read,
        m.created_at,
        u.full_name as sender_name,
        u.profile_photo as sender_photo
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
    ''', (conversation_id,))

    messages = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {"success": True, "messages": messages}

@router.post("/start")
async def start_conversation(req: StartConversationRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if req.recipient_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot start a conversation with yourself")

    conn = get_db()
    cursor = conn.cursor()

    # Check if recipient exists
    cursor.execute("SELECT id, full_name, profile_photo FROM users WHERE id = ?", (req.recipient_id,))
    recipient = cursor.fetchone()
    if not recipient:
        conn.close()
        raise HTTPException(status_code=404, detail="Recipient student not found")

    # Check if conversation already exists between these two users for this product/service (or in general)
    cursor.execute('''
    SELECT id FROM conversations 
    WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
    ''', (user_id, req.recipient_id, req.recipient_id, user_id))
    existing = cursor.fetchone()

    if existing:
        conv_id = existing["id"]
        # Update product/service context if passed
        if req.product_id or req.service_id:
            cursor.execute("UPDATE conversations SET product_id = coalesce(?, product_id), service_id = coalesce(?, service_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?", (req.product_id, req.service_id, conv_id))
            conn.commit()
    else:
        cursor.execute('''
        INSERT INTO conversations (user1_id, user2_id, product_id, service_id, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (user_id, req.recipient_id, req.product_id, req.service_id))
        conv_id = cursor.lastrowid
        conn.commit()

    # If initial message provided, send it
    if req.initial_message and req.initial_message.strip():
        cursor.execute('''
        INSERT INTO messages (conversation_id, sender_id, text, is_read, created_at)
        VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
        ''', (conv_id, user_id, req.initial_message.strip()))
        msg_id = cursor.lastrowid
        conn.commit()

        # Broadcast via WebSocket
        msg_payload = {
            "type": "new_message",
            "message": {
                "id": msg_id,
                "conversation_id": conv_id,
                "sender_id": user_id,
                "sender_name": current_user["full_name"],
                "sender_photo": current_user["profile_photo"],
                "text": req.initial_message.strip(),
                "created_at": "Just now",
                "is_read": 0
            }
        }
        await ws_manager.broadcast_to_conversation(msg_payload, [user_id, req.recipient_id])

    conn.close()
    return {"success": True, "conversation_id": conv_id}

@router.post("/messages")
async def send_message(req: SendMessageRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT user1_id, user2_id FROM conversations WHERE id = ?", (req.conversation_id,))
    conv = cursor.fetchone()
    if not conv or (conv["user1_id"] != user_id and conv["user2_id"] != user_id):
        conn.close()
        raise HTTPException(status_code=403, detail="Unauthorized conversation access")

    recipient_id = conv["user2_id"] if conv["user1_id"] == user_id else conv["user1_id"]

    cursor.execute('''
    INSERT INTO messages (conversation_id, sender_id, text, is_read, created_at)
    VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
    ''', (req.conversation_id, user_id, text))
    msg_id = cursor.lastrowid

    cursor.execute("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (req.conversation_id,))
    conn.commit()

    cursor.execute("SELECT created_at FROM messages WHERE id = ?", (msg_id,))
    created_at = cursor.fetchone()["created_at"]
    conn.close()

    msg_payload = {
        "type": "new_message",
        "message": {
            "id": msg_id,
            "conversation_id": req.conversation_id,
            "sender_id": user_id,
            "sender_name": current_user["full_name"],
            "sender_photo": current_user["profile_photo"],
            "text": text,
            "created_at": created_at,
            "is_read": 0
        }
    }

    await ws_manager.broadcast_to_conversation(msg_payload, [user_id, recipient_id])

    return {"success": True, "message": msg_payload["message"]}

@router.get("/unread-count")
def get_total_unread_count(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    SELECT COUNT(*) as unread
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE (c.user1_id = ? OR c.user2_id = ?) AND m.sender_id != ? AND m.is_read = 0
    ''', (user_id, user_id, user_id))

    count = cursor.fetchone()["unread"]
    conn.close()

    return {"success": True, "unread_count": count}
