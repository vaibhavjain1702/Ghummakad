"""FastAPI backend for the Intelligent Travel Planner (Python migration).

Serves the vanilla-JS frontend from templates/ + static/ and exposes two
JSON endpoints that delegate to gemini_service:
  - POST /api/generate : UserPreferences -> full itinerary dict
  - POST /api/remix    : existing itinerary dict -> mutated itinerary dict
"""

import os
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request

from models import UserPreferences
from gemini_service import generate_itinerary, mutate_itinerary

# Load environment variables (.env) at startup.
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ensure sibling dirs exist so boot never crashes before teammates' files land.
os.makedirs(os.path.join(BASE_DIR, "static"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "templates"), exist_ok=True)

app = FastAPI(title="Intelligent Travel Planner")

# Dev parity with the old Vite setup: allow any origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


@app.get("/")
async def index(request: Request):
    """Render the self-contained frontend page."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/generate")
async def api_generate(prefs: UserPreferences):
    """Generate a new itinerary. Accepts camelCase or snake_case via aliases."""
    try:
        result = await generate_itinerary(prefs)
        return JSONResponse(result)
    except Exception as e:
        traceback.print_exc()  # full server-side trace for debugging
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/remix")
async def api_remix(body: dict):
    """Mutate an existing itinerary (raw camelCase dict from the frontend)."""
    try:
        result = await mutate_itinerary(body)
        return JSONResponse(result)
    except Exception as e:
        traceback.print_exc()  # full server-side trace for debugging
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    # Railway/most PaaS inject PORT; locally default to 3000 for dev parity.
    port = int(os.environ.get("PORT", "3000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
