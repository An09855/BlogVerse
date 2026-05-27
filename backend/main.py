import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from database import Base, SessionLocal, engine
from models import User
from auth import get_password_hash

from routers.auth_router import router as auth_router
from routers.blog_router import router as blog_router
from routers.user_router import router as user_router

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

UPLOADS_DIR = Path("uploads")
FRONTEND_DIR = Path(r"g:\code\blog\frontend")

# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler — runs once on startup and once on shutdown."""

    # --- Startup ------------------------------------------------------------
    # 1. Create all tables
    Base.metadata.create_all(bind=engine)

    # 2. Ensure uploads directory exists
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # 3. Seed default admin user
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin123@gmail.com").first()
        if not admin:
            admin = User(
                email="admin123@gmail.com",
                nickname="Admin",
                password_hash=get_password_hash("admin123"),
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            print("[OK] Default admin user created (admin123@gmail.com / admin123)")
        else:
            print("[INFO] Admin user already exists - skipping seed.")
    finally:
        db.close()

    yield  # ← application is running

    # --- Shutdown -----------------------------------------------------------
    # Nothing to clean up for now.


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Blog Platform API",
    description="A full-featured blog platform backend built with FastAPI and PostgreSQL.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth_router)
app.include_router(blog_router)
app.include_router(user_router)

# ---------------------------------------------------------------------------
# Static file mounts
# ---------------------------------------------------------------------------

# Serve uploaded avatars at /uploads/<filename>
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Serve frontend assets (JS, CSS, images, etc.) at /static
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# ---------------------------------------------------------------------------
# Frontend SPA routes
# ---------------------------------------------------------------------------


@app.get("/", response_class=HTMLResponse)
def serve_root():
    """Serve the frontend index.html at the root URL."""
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return HTMLResponse(
        content="<h1>Blog Platform API</h1><p>Frontend not found. API is running at <code>/docs</code>.</p>",
        status_code=200,
    )


