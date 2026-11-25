import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from server.database import init_db, seed_data
from server.auth import decode_access_token
from server.websocket_manager import ws_manager
from server.routes.auth_routes import router as auth_router
from server.routes.marketplace_routes import router as marketplace_router
from server.routes.services_routes import router as services_router
from server.routes.notes_routes import router as notes_router
from server.routes.chat_routes import router as chat_router
from server.routes.dashboard_routes import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database & default seed data on startup
    init_db()
    seed_data()
    yield

app = FastAPI(
    title="Campus Kart API",
    description="Student Marketplace & Services Platform for Chandigarh University",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(marketplace_router)
app.include_router(services_router)
app.include_router(notes_router)
app.include_router(chat_router)
app.include_router(dashboard_router)

# WebSocket Real-Time Chat Endpoint
@app.websocket("/ws/chat/{user_id}")
async def chat_websocket_endpoint(websocket: WebSocket, user_id: int, token: str = Query(None)):
    # Validate token if passed
    if token:
        payload = decode_access_token(token)
        if not payload or int(payload.get("sub", -1)) != user_id:
            await websocket.close(code=1008)
            return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle incoming typing or ping events if needed
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)

# Mount Uploads directory
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Mount Static assets
os.makedirs("static", exist_ok=True)
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)

# SPA fallback & index route
@app.get("/")
async def serve_index():
    return FileResponse("static/index.html")

app.mount("/static", StaticFiles(directory="static"), name="static")

# Catch-all to serve index.html for SPA page paths
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("ws/") or full_path.startswith("uploads/"):
        return {"error": "Not Found"}
    static_file = os.path.join("static", full_path)
    if os.path.exists(static_file) and os.path.isfile(static_file):
        return FileResponse(static_file)
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")
    print(f"Starting Campus Kart on http://{host}:{port}")
    uvicorn.run("server.main:app", host=host, port=port, reload=True)
