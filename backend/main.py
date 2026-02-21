"""
Sherpa Travel Planner — FastAPI Backend
Replaces the Streamlit app.py logic with proper REST + streaming API endpoints.
"""

import os, json, re
from dotenv import load_dotenv
load_dotenv()
from datetime import date, timedelta
from typing import Optional
from contextlib import asynccontextmanager

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ── Config ────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY       = os.getenv("ANTHROPIC_API_KEY", "")
SKYSCANNER_AFFILIATE_ID = os.getenv("SKYSCANNER_AFFILIATE_ID", "")
BOOKING_AFFILIATE_ID    = os.getenv("BOOKING_AFFILIATE_ID", "")
GYG_PARTNER_ID          = os.getenv("GYG_PARTNER_ID", "")
RENTALCARS_AFFILIATE_ID = os.getenv("RENTALCARS_AFFILIATE_ID", "")

claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Sherpa API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://sherpaai.uk",
        "https://sherpatravel.uk",
        "https://www.sherpatravel.uk",
        "https://sherpa-lude339ru-jamesgiblin94s-projects.vercel.app",
        "https://sherpa-six.vercel.app",
    ],

# ── Helpers ───────────────────────────────────────────────────────────────────
def skyscanner_url(origin_sky: str, dest_sky: str, depart: str, ret: str, adults: int) -> str:
    """Build a Skyscanner deep-link URL."""
    params = f"?adults={adults}"
    if SKYSCANNER_AFFILIATE_ID:
        params += f"&associateid={SKYSCANNER_AFFILIATE_ID}"
    return (
        f"https://www.skyscanner.net/transport/flights/"
        f"{origin_sky.lower()}/{dest_sky.lower()}/{depart}/{ret}/{params}"
    )

def booking_url(dest: str, checkin: str, checkout: str, adults: int, rooms: int) -> str:
    import urllib.parse
    params = urllib.parse.urlencode({
        "ss": dest, "checkin": checkin, "checkout": checkout,
        "group_adults": adults, "no_rooms": rooms,
        "aid": BOOKING_AFFILIATE_ID or "304142", "lang": "en-gb",
    })
    return f"https://www.booking.com/searchresults.html?{params}"

def claude_json(prompt: str, model: str = "claude-haiku-4-5-20251001", max_tokens: int = 1000) -> dict:
    """Call Claude and parse JSON from the response."""
    resp = claude.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}]
    )
    text = resp.content[0].text.strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        return json.loads(m.group())
    raise ValueError(f"No JSON in response: {text[:200]}")

def get_first_weekend(month_name: str):
    month_map = {
        "January":1,"February":2,"March":3,"April":4,"May":5,"June":6,
        "July":7,"August":8,"September":9,"October":10,"November":11,"December":12,
    }
    year  = date.today().year
    month = month_map.get(month_name, 5)
    if date(year, month, 1) < date.today():
        year += 1
    d = date(year, month, 1)
    # Find first Friday
    while d.weekday() != 4:
        d += timedelta(days=1)
    return d.isoformat(), (d + timedelta(days=3)).isoformat()


# ── Request models ────────────────────────────────────────────────────────────
class InspireRequest(BaseModel):
    starting_point: str
    budget: str = "££ — Mid-range"
    group_type: str = "Couple"
    trip_type: list[str] = []
    transport_mode: str = "willing to rent"
    priorities: str = ""
    travel_month: Optional[str] = "May"
    specific_depart: Optional[str] = None
    specific_return: Optional[str] = None
    dest_preference: Optional[str] = ""
    num_adults: int = 2

class ItineraryRequest(BaseModel):
    dest: str
    dest_city: str
    origin_city: str
    starting_point: str
    budget: str
    group_type: str
    trip_type: list[str]
    transport_mode: str
    priorities: str
    specific_depart: Optional[str] = None
    specific_return: Optional[str] = None
    travel_month: str = "May"
    num_adults: int = 2
    selected_hotel: str = ""
    car_hire_confirmed: Optional[str] = None
    arrival_time: str = "11:00"
    departure_time: str = "14:00"
    arrival_airport: str = ""
    transfer_label: str = "30 min"

class CarHireRequest(BaseModel):
    dest: str
    dest_city: str
    trip_type: list[str]
    origin_sky: str = "LOND"
    dest_sky: str = ""
    depart_date: str = ""
    return_date: str = ""
    num_adults: int = 2

class AccomTipsRequest(BaseModel):
    dest: str
    dest_city: str
    budget: str
    group_type: str
    trip_type: list[str]
    priorities: str = ""
    car_hire: Optional[str] = None

class HotelNoteRequest(BaseModel):
    hotel: str
    dest_city: str
    dest: str
    group_type: str
    car_hire: Optional[str] = None
    priorities: str = ""

class ActivitiesRequest(BaseModel):
    dest_city: str
    itinerary: str
    gyg_partner_id: str = ""

class TweakRequest(BaseModel):
    dest: str
    dest_city: str
    itinerary: str
    feedback: str
    origin_city: str = ""

class MapPinsRequest(BaseModel):
    itinerary: str
    dest_city: str

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    context: str = ""

class LocalGuideRequest(BaseModel):
    lat: float
    lon: float
    dest_city: str = ""

class AirportsRequest(BaseModel):
    dest_city: str


# ── UK Airport list ───────────────────────────────────────────────────────────
UK_AIRPORTS = [
    {"label": "Aberdeen (ABZ)",                             "value": "aberdeen",     "sky": "ABZ",  "iata": ["ABZ"]},
    {"label": "Belfast — all airports (BFS/BHD)",           "value": "belfast",      "sky": "BELF", "iata": ["BFS","BHD"]},
    {"label": "Birmingham (BHX)",                           "value": "birmingham",   "sky": "BHX",  "iata": ["BHX"]},
    {"label": "Bournemouth (BOH)",                          "value": "bournemouth",  "sky": "BOH",  "iata": ["BOH"]},
    {"label": "Bristol (BRS)",                              "value": "bristol",      "sky": "BRS",  "iata": ["BRS"]},
    {"label": "Cardiff (CWL)",                              "value": "cardiff",      "sky": "CWL",  "iata": ["CWL"]},
    {"label": "Doncaster Sheffield (DSA)",                  "value": "doncaster",    "sky": "DSA",  "iata": ["DSA"]},
    {"label": "East Midlands (EMA)",                        "value": "east midlands","sky": "EMA",  "iata": ["EMA"]},
    {"label": "Edinburgh (EDI)",                            "value": "edinburgh",    "sky": "EDI",  "iata": ["EDI"]},
    {"label": "Exeter (EXT)",                               "value": "exeter",       "sky": "EXT",  "iata": ["EXT"]},
    {"label": "Glasgow — all airports (GLA/PIK)",           "value": "glasgow",      "sky": "GLAS", "iata": ["GLA","PIK"]},
    {"label": "Glasgow Prestwick (PIK)",                    "value": "prestwick",    "sky": "PIK",  "iata": ["PIK"]},
    {"label": "Guernsey (GCI)",                             "value": "guernsey",     "sky": "GCI",  "iata": ["GCI"]},
    {"label": "Inverness (INV)",                            "value": "inverness",    "sky": "INV",  "iata": ["INV"]},
    {"label": "Isle of Man (IOM)",                          "value": "isle of man",  "sky": "IOM",  "iata": ["IOM"]},
    {"label": "Jersey (JER)",                               "value": "jersey",       "sky": "JER",  "iata": ["JER"]},
    {"label": "Leeds Bradford (LBA)",                       "value": "leeds",        "sky": "LBA",  "iata": ["LBA"]},
    {"label": "Liverpool (LPL)",                            "value": "liverpool",    "sky": "LPL",  "iata": ["LPL"]},
    {"label": "London — all airports (LHR/LGW/STN/LTN/LCY)","value": "london",     "sky": "LOND", "iata": ["LHR","LGW","STN","LTN","LCY"]},
    {"label": "London City (LCY)",                          "value": "london city",  "sky": "LCY",  "iata": ["LCY"]},
    {"label": "London Gatwick (LGW)",                       "value": "gatwick",      "sky": "LGW",  "iata": ["LGW"]},
    {"label": "London Heathrow (LHR)",                      "value": "heathrow",     "sky": "LHR",  "iata": ["LHR"]},
    {"label": "London Luton (LTN)",                         "value": "luton",        "sky": "LTN",  "iata": ["LTN"]},
    {"label": "London Southend (SEN)",                      "value": "southend",     "sky": "SEN",  "iata": ["SEN"]},
    {"label": "London Stansted (STN)",                      "value": "stansted",     "sky": "STN",  "iata": ["STN"]},
    {"label": "Manchester (MAN)",                           "value": "manchester",   "sky": "MAN",  "iata": ["MAN"]},
    {"label": "Newcastle (NCL)",                            "value": "newcastle",    "sky": "NCL",  "iata": ["NCL"]},
    {"label": "Newquay (NQY)",                              "value": "newquay",      "sky": "NQY",  "iata": ["NQY"]},
    {"label": "Norwich (NWI)",                              "value": "norwich",      "sky": "NWI",  "iata": ["NWI"]},
    {"label": "Southampton (SOU)",                          "value": "southampton",  "sky": "SOU",  "iata": ["SOU"]},
    {"label": "Teesside / Durham (MME)",                    "value": "teesside",     "sky": "MME",  "iata": ["MME"]},
]

@app.get("/api/uk-airports")
def get_uk_airports():
    return UK_AIRPORTS


# ── Destination airports ──────────────────────────────────────────────────────
@app.post("/api/dest-airports")
def get_dest_airports(req: AirportsRequest):
    """Ask Claude for the airports serving a destination city."""
    prompt = (
        f"List the main airports serving {req.dest_city} for international flights from the UK. "
        "Return ONLY valid JSON:\n"
        '{"airports": [{"airport_name": "...", "iata": "XXX", "sky": "XXX", '
        '"transfer_label": "approx X min by metro/taxi", '
        '"transfer_mins": 30, '
        '"transfer_legs": [{"mode": "Metro", "mins": 25, "detail": "Line 1 to city centre"}]}]}'
        "\n\nIf there is only one main airport, return just that one. "
        "sky code = Skyscanner airport/city code."
    )
    try:
        data = claude_json(prompt)
        return data.get("airports", [])
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Inspire ───────────────────────────────────────────────────────────────────
@app.post("/api/inspire")
def inspire(req: InspireRequest):
    """Generate 1-3 destination suggestions."""
    trip_type_text = " / ".join(req.trip_type) if req.trip_type else "Any"
    date_text = (
        f"{req.specific_depart} to {req.specific_return}"
        if req.specific_depart else f"Flexible — {req.travel_month}"
    )
    transport_text = (
        "PUBLIC TRANSPORT ONLY — no car hire" if "public transport" in req.transport_mode.lower()
        else "Open to car hire"
    )

    # Determine number of suggestions based on dest_preference
    dp = (req.dest_preference or "").strip()
    known_regions = [
        "portugal","spain","france","italy","greece","turkey","croatia","morocco",
        "japan","thailand","iceland","ireland","scotland","wales","andalusia","algarve",
        "tuscany","sicily","corsica","provence","catalonia","scandina","caribbean",
        "canary islands","balearic islands","azores","madeira","uk","england","europe",
        "asia","africa",
    ]
    if dp:
        is_region = any(r in dp.lower() for r in known_regions)
        n_dest = 3 if is_region else 1
        dest_instr = (
            f"Suggest {n_dest} different destinations within or nearby {dp}."
            if is_region else
            f"Return EXACTLY 1 destination card for {dp}. Do NOT suggest alternatives."
        )
    else:
        n_dest = 3
        dest_instr = "Suggest 3 varied destinations suited to this traveller."

    prompt = f"""You are Sherpa, an expert UK travel planner. {dest_instr}

TRAVELLER PROFILE:
- Departing from: {req.starting_point}
- Dates: {date_text}
- Budget: {req.budget}
- Group: {req.group_type} ({req.num_adults} adults)
- Trip type: {trip_type_text}
- Transport: {transport_text}
- Priorities: {req.priorities or "none specified"}

For each destination return a card in EXACTLY this format (---DESTINATION--- before, ---END--- after):

---DESTINATION---
CITY: [City name]
COUNTRY: [Country]
EMOJI: [one relevant emoji]
TAGLINE: [one punchy sentence, max 12 words]
FLIGHT: [X–X hrs | example airline | departure airport e.g. LHR, MAN]
BEST_FOR: [2–3 words]
BUDGET_NOTE: [one sentence on cost level and value]
HIGHLIGHTS: [3 bullet points, each starting with •]
WEATHER: [expected weather for {date_text}]
DISH: [one must-try local dish]
AIRPORT_CODE: [main IATA code e.g. LIS]
COST_GUIDE:
- Flights: £X–£X return pp
- Food & drink: £X–£X per day  
- Activities: £X–£X total
- Local transport: £X–£X
- **Estimated total (exc. accommodation): £X–£X per person**
---END---

Return exactly {n_dest} destination(s). No other text."""

    resp = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = resp.content[0].text
    destinations = []
    for block in raw.split("---DESTINATION---"):
        if "---END---" not in block:
            continue
        body = block.split("---END---")[0].strip()
        d: dict = {}
        for line in body.split("\n"):
            line = line.strip()
            if ":" in line:
                key, _, val = line.partition(":")
                key = key.strip().upper()
                val = val.strip()
                if key == "HIGHLIGHTS":
                    continue
                d[key] = val
        # Parse highlights
        highlights = [l.strip().lstrip("•").strip() for l in body.split("\n") if l.strip().startswith("•")]
        d["highlights"] = highlights
        # Parse cost guide
        cost_lines = []
        in_cost = False
        for line in body.split("\n"):
            if line.strip().startswith("COST_GUIDE"):
                in_cost = True
                continue
            if in_cost and line.strip().startswith("-"):
                cost_lines.append(line.strip())
        d["cost_guide"] = cost_lines
        if d.get("CITY"):
            destinations.append(d)

    return {"destinations": destinations}


# ── Itinerary (streaming) ─────────────────────────────────────────────────────
@app.post("/api/itinerary")
def build_itinerary(req: ItineraryRequest):
    """Stream the full itinerary as it generates."""
    trip_type_text = " / ".join(req.trip_type) if req.trip_type else "City Break"
    date_text = (
        f"{req.specific_depart} to {req.specific_return}"
        if req.specific_depart else f"Flexible — {req.travel_month}"
    )
    car_hire_note = ""
    if req.car_hire_confirmed == "yes":
        car_hire_note = (
            "CRITICAL: This traveller IS hiring a car. They collect it AT THE ARRIVAL AIRPORT "
            "immediately on landing. Getting There MUST describe collecting the hire car at the "
            "airport car hire desk and driving directly to accommodation — no other transfer."
        )
    elif "public transport" in req.transport_mode.lower():
        car_hire_note = "This traveller is using PUBLIC TRANSPORT ONLY — no car hire at any point."

    prompt = f"""You are Sherpa, an expert travel planner. Create a detailed day-by-day itinerary for {req.dest}.

TRAVELLER PROFILE:
- Flying from: {req.origin_city}
- Dates: {date_text}
- Budget: {req.budget}
- Group: {req.group_type} ({req.num_adults} adults)
- Trip type: {trip_type_text}
- Priorities: {req.priorities or "none specified"}
- Staying at: {req.selected_hotel or "not yet decided"}
- Arriving: {req.arrival_airport or req.dest_city} at {req.arrival_time}
- Departing: {req.departure_time} on last day
- Airport transfer: {req.transfer_label} from airport to city centre
{car_hire_note}

FORMAT — use these exact ## headings:

## ✈️ Getting There
[Transfer from {req.arrival_airport or req.dest_city + ' airport'} to accommodation — specific method, duration, cost]

## Day 1 — [Title]
**🌅 Morning:** ...
**🍽️ Lunch:** [specific restaurant name, neighbourhood, dish, rough cost]
**☀️ Afternoon:** ...
**🍷 Dinner:** [specific restaurant name, neighbourhood, cuisine, rough cost for two]
**🌙 Evening:** ...

[Repeat for each day]

## 🏠 Getting Home
[Transfer back to airport, allow {req.transfer_label} + 2hr check-in]

## 💰 Cost Guide
- Flights: £X–£X return pp
- Accommodation: £X–£X per night
- Food & drink: £X–£X per day
- Activities: £X–£X total
- Local transport: £X–£X
- **Estimated total: £X–£X per person**

## 📌 Local Tips
[3 short practical tips that most travel guides miss]

Be specific — name real restaurants, streets, neighbourhoods. Tailor everything to the {req.budget} budget."""

    def generate():
        with claude.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ── Car hire ──────────────────────────────────────────────────────────────────
@app.post("/api/car-hire")
def car_hire(req: CarHireRequest):
    trip_str = " / ".join(req.trip_type) if req.trip_type else "City Break"
    prompt = (
        f"You are a travel expert. The traveller is visiting {req.dest} on a {trip_str} trip.\n\n"
        "Rate how important hiring a car is (1=not needed, 5=essential). "
        "Recommend the top 3 best-reviewed car hire companies at the destination airport. "
        "Identify 2 companies worth avoiding.\n\n"
        "Return ONLY valid JSON:\n"
        '{"rating": 3, "reasons": ["..."], "companies": ['
        '{"name": "...", "rating": "8.5/10", "highlight": "..."}], '
        '"avoid": [{"name": "...", "rating": "5.1/10", "reason": "..."}]}'
    )
    # Build Rentalcars URL
    rc_url = ""
    if req.depart_date and req.return_date:
        rc_url = (
            f"https://www.rentalcars.com/SearchResults.do"
            f"?addrCode={req.dest_sky or req.dest_city[:3].upper()}"
            f"&puDay={req.depart_date[6:]}&puMonth={req.depart_date[3:5]}&puYear={req.depart_date[:4]}"
            f"&doDay={req.return_date[6:]}&doMonth={req.return_date[3:5]}&doYear={req.return_date[:4]}"
            + (f"&affiliateCode={RENTALCARS_AFFILIATE_ID}" if RENTALCARS_AFFILIATE_ID else "")
        )
    try:
        data = claude_json(prompt)
        data["rentalcars_url"] = rc_url
        return data
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Accommodation tips ────────────────────────────────────────────────────────
@app.post("/api/accom-tips")
def accom_tips(req: AccomTipsRequest):
    car_context = (
        "HIRING A CAR: Yes — prioritise areas with parking, note parking costs."
        if req.car_hire == "yes" else
        "NOT HIRING A CAR: Prioritise walkable areas and good transit links. Mention specific metro/bus lines."
        if req.car_hire == "no" else
        "Car hire unknown — balance walkability with transport links."
    )
    prompt = f"""You are a local expert giving a UK traveller advice on where to stay in {req.dest}.

PROFILE: Budget={req.budget}, Group={req.group_type}, Trip={" / ".join(req.trip_type) or "general"}
Interests: {req.priorities or "none"}, {car_context}

Return ONLY valid JSON:
{{"areas": [{{"name":"...", "vibe":"3-5 words", "best_for":"...", "price_range":"approx £X-£X/night", "tip":"..."}}],
"booking_tips": ["tip 1 referencing transport", "tip 2 for budget/group", "tip 3 watch out for"],
"avoid": "one sentence on what to avoid given transport + budget"}}

Use real neighbourhood names. Tailor to {req.budget} budget and {req.group_type}. Give 3 areas."""
    try:
        return claude_json(prompt, max_tokens=900)
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Hotel note ────────────────────────────────────────────────────────────────
@app.post("/api/hotel-note")
def hotel_note(req: HotelNoteRequest):
    prompt = (
        f"Give a short honest briefing on '{req.hotel}' in {req.dest_city} "
        f"for a {req.group_type} traveller {'with a hire car' if req.car_hire=='yes' else 'using public transport'}.\n"
        "Cover in 3-4 sentences: neighbourhood and what it's like, how well-located for main sights, "
        f"{'parking situation' if req.car_hire=='yes' else 'nearest transport links'}, "
        f"and one pro or con for this traveller"
        + (f" interested in {req.priorities}" if req.priorities else "") + ". "
        "If you don't recognise the specific property, describe the area. Be concise and practical."
    )
    try:
        resp = claude.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        return {"note": resp.content[0].text.strip()}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── GYG Activities ────────────────────────────────────────────────────────────
@app.post("/api/activities")
def activities(req: ActivitiesRequest):
    prompt = (
        f"Extract up to 6 specific bookable activities or experiences from this {req.dest_city} itinerary "
        "that benefit from advance booking (tours, skip-the-line tickets, cooking classes, etc).\n\n"
        f"Itinerary:\n{req.itinerary[:3000]}\n\n"
        'Return ONLY valid JSON: {"activities": [{"name":"...", "type":"...", "why_book_ahead":"...", '
        '"search_term":"short search term for GetYourGuide"}]}'
    )
    try:
        data = claude_json(prompt, max_tokens=600)
        activities_list = data.get("activities", [])
        partner = req.gyg_partner_id or GYG_PARTNER_ID
        # Add GYG URLs
        for a in activities_list:
            q = a.get("search_term", a.get("name", "")).replace(" ", "+")
            a["gyg_url"] = (
                f"https://www.getyourguide.com/s/?q={q}&partner_id={partner}"
                if partner else
                f"https://www.getyourguide.com/s/?q={q}"
            )
        return {"activities": activities_list}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Itinerary tweak (streaming) ───────────────────────────────────────────────
@app.post("/api/tweak")
def tweak_itinerary(req: TweakRequest):
    prompt = (
        f"Here is a travel itinerary for {req.dest}:\n\n{req.itinerary}\n\n"
        f"The traveller has asked: {req.feedback}\n\n"
        "Rewrite the full itinerary incorporating these changes. "
        "Keep everything that works well and only change what was asked. "
        "Return the full itinerary in exactly the same format — same ## headings, same structure."
    )

    def generate():
        with claude.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ── Map pins ──────────────────────────────────────────────────────────────────
@app.post("/api/map-pins")
def map_pins(req: MapPinsRequest):
    prompt = (
        f"Extract all named locations from this {req.dest_city} itinerary as map pins.\n\n"
        f"{req.itinerary[:4000]}\n\n"
        'Return ONLY valid JSON: {"locations": [{"name":"...", "type":"Restaurant|Attraction|Hotel|Museum|Bar|Market|Park|Viewpoint|Beach", "description":"one line"}]}'
    )
    try:
        return claude_json(prompt, max_tokens=800)
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Support chat ──────────────────────────────────────────────────────────────
@app.post("/api/chat")
def chat(req: ChatRequest):
    system = (
        "You are Sherpa, a friendly expert travel assistant. "
        "Answer concisely and practically. " +
        (f"Context about this trip: {req.context}" if req.context else "")
    )
    messages = req.history + [{"role": "user", "content": req.message}]
    resp = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        system=system,
        messages=messages
    )
    return {"reply": resp.content[0].text.strip()}


# ── Local guide: nearby places ────────────────────────────────────────────────
@app.post("/api/nearby")
def nearby(req: LocalGuideRequest):
    prompt = (
        f"The traveller is at coordinates {req.lat:.4f}, {req.lon:.4f}"
        + (f" in {req.dest_city}" if req.dest_city else "") + ".\n"
        "List 8 interesting places within 1km — mix of restaurants, cafes, attractions, markets, viewpoints.\n"
        'Return ONLY valid JSON: {"places": [{"name":"...", "type":"Restaurant|Cafe|Bar|Attraction|Market|Viewpoint|Park", '
        '"distance":"approx Xm", "why":"one sentence on why it\'s worth visiting"}]}'
    )
    try:
        return claude_json(prompt, max_tokens=700)
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Local guide: history ──────────────────────────────────────────────────────
@app.post("/api/history")
def history(req: LocalGuideRequest):
    prompt = (
        f"The traveller is at {req.lat:.4f}, {req.lon:.4f}"
        + (f" in {req.dest_city}" if req.dest_city else "") + ".\n"
        "Write 3-4 sentences of engaging local history about this specific location or the immediate neighbourhood. "
        "Focus on surprising or little-known facts. Be vivid and specific."
    )
    resp = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return {"history": resp.content[0].text.strip()}


# ── Affiliate URL builders ────────────────────────────────────────────────────
@app.get("/api/config")
def get_config():
    """Return affiliate IDs and config needed by the frontend."""
    return {
        "skyscanner_affiliate": SKYSCANNER_AFFILIATE_ID,
        "booking_affiliate": BOOKING_AFFILIATE_ID,
        "gyg_partner": GYG_PARTNER_ID,
        "rentalcars_affiliate": RENTALCARS_AFFILIATE_ID,
    }


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}
