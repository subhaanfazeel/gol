from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import json, os, random
from datetime import datetime, date

app = FastAPI()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "player_data.json")

def load_data():
    if not os.path.exists(DATA_FILE):
        d = {
            "tasks": [], "punishments": ["Cold shower 10m"], "non_negotiables": [],
            "streak": 0, "best_streak": 0, "last_login": None, "name": "",
            "shop": {"coins":0, "items": []}, "diary": [], "settings": {"sounds": True, "mobile_fullscreen": True},
            "stats": {"tasks_completed":0}
        }
        save_data(d)
        return d
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_data(d):
    with open(DATA_FILE, "w") as f:
        json.dump(d, f, indent=2, default=str)

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

@app.get("/")
async def index():
    return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))

@app.get("/api/data")
async def get_data():
    d = load_data()
    today = date.today()
    last = date.fromisoformat(d["last_login"]) if d["last_login"] else None
    missed=False; punishment=None
    if last is None or (today - last).days > 1:
        missed=True
        punishment = random.choice(d.get("punishments",["Default punish: 15m cold shower"]))
        d["streak"]=0
        d["last_login"]=datetime.now().isoformat()
        save_data(d)
    elif (today - last).days == 1:
        d["streak"] = d.get("streak",0)+1
        if d["streak"]>d.get("best_streak",0):
            d["best_streak"]=d["streak"]
        d["last_login"]=datetime.now().isoformat()
        save_data(d)
    return {"data": d, "missed_day": missed, "punishment": punishment}

@app.post("/api/name")
async def set_name(req: Request):
    body = await req.json()
    name = body.get("name","").strip()
    d = load_data()
    d["name"]=name
    if not d["last_login"]:
        d["last_login"]=datetime.now().isoformat()
    save_data(d)
    return {"name": name}

@app.post("/api/nonneg/add")
async def add_nonneg(request: Request):
    body = await request.json()
    rule = body.get("rule")
    d = load_data()
    if rule:
        d["non_negotiables"].append(rule)
        save_data(d)
    return {"non_negotiables": d["non_negotiables"]}

@app.post("/api/nonneg/delete/{idx}")
async def delete_nonneg(idx: int):
    d = load_data()
    if 0 <= idx < len(d["non_negotiables"]):
        d["non_negotiables"].pop(idx)
        save_data(d)
    return {"non_negotiables": d["non_negotiables"]}

@app.post("/api/tasks/add")
async def add_task(request: Request):
    body = await request.json()
    task = body.get("task")
    deadline = body.get("deadline")
    d = load_data()
    if task:
        d["tasks"].append({"task": task, "deadline": deadline, "done": False, "created": datetime.now().isoformat()})
        save_data(d)
    return {"tasks": d["tasks"]}

@app.post("/api/tasks/toggle/{idx}")
async def toggle_task(idx: int):
    d = load_data()
    if 0 <= idx < len(d["tasks"]):
        d["tasks"][idx]["done"] = not d["tasks"][idx]["done"]
        if d["tasks"][idx]["done"]:
            d["stats"]["tasks_completed"] = d["stats"].get("tasks_completed",0)+1
            d["shop"]["coins"] = d["shop"].get("coins",0)+5
        save_data(d)
    return {"tasks": d["tasks"], "stats": d["stats"], "shop": d["shop"]}

@app.post("/api/punishments/add")
async def add_punishment(request: Request):
    body = await request.json()
    text = body.get("punishment")
    d = load_data()
    if text:
        d["punishments"].append(text)
        save_data(d)
    return {"punishments": d["punishments"]}

@app.get("/api/punishments")
async def get_punishments():
    d = load_data()
    return {"punishments": d["punishments"]}

# Diary
@app.post("/api/diary/add")
async def diary_add(req: Request):
    body = await req.json()
    entry = body.get("entry","")
    d = load_data()
    if entry:
        d["diary"].append({"text": entry, "ts": datetime.now().isoformat()})
        save_data(d)
    return {"diary": d["diary"]}

@app.get("/api/diary")
async def diary_get():
    d = load_data()
    return {"diary": d["diary"]}

# Shop endpoints (simple)
@app.get("/api/shop")
async def shop_get():
    d = load_data()
    return {"shop": d["shop"], "catalog":[{"id":1,"name":"Glowy Banner","price":10},{"id":2,"name":"Mute Punishments","price":50}]}

@app.post("/api/shop/buy/{item_id}")
async def shop_buy(item_id: int):
    d = load_data()
    catalog = {1:{"name":"Glowy Banner","price":10},2:{"name":"Mute Punishments","price":50}}
    item = catalog.get(item_id)
    if not item:
        return JSONResponse({"error":"Item not found"}, status_code=404)
    if d["shop"].get("coins",0) < item["price"]:
        return JSONResponse({"error":"Not enough coins"}, status_code=400)
    d["shop"]["coins"] -= item["price"]
    d["shop"]["items"].append(item["name"])
    save_data(d)
    return {"shop": d["shop"]}

# Settings
@app.post("/api/settings")
async def save_settings(req: Request):
    body = await req.json()
    d = load_data()
    d["settings"].update(body)
    save_data(d)
    return {"settings": d["settings"]}

@app.get("/api/stats")
async def get_stats():
    d = load_data()
    return {"stats": d["stats"]}
