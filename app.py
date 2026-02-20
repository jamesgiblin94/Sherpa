from dotenv import load_dotenv
import os
import streamlit as st
import anthropic
from datetime import date, timedelta
from airports import get_iata_codes, get_sky_code, get_primary_iata, get_all_iata_string, get_nearest_airport

# ============================================================
# CONFIGURATION
# Reads from Streamlit Cloud secrets when deployed,
# falls back to .env for local development.
# ============================================================
load_dotenv()

def _secret(key, default=""):
    """Read from st.secrets (cloud) with os.getenv fallback (local)."""
    try:
        val = st.secrets.get(key)
        if val:
            return val
    except Exception:
        pass
    return os.getenv(key, default) or default

ANTHROPIC_API_KEY       = _secret("ANTHROPIC_API_KEY",       "")
SKYSCANNER_AFFILIATE_ID = _secret("SKYSCANNER_AFFILIATE_ID", "")
GOOGLE_MAPS_API_KEY     = _secret("GOOGLE_MAPS_API_KEY",     "")
BOOKING_AFFILIATE_ID    = _secret("BOOKING_AFFILIATE_ID",    "")

# ============================================================
# PAGE SETUP
# ============================================================
st.set_page_config(
    page_title="Sherpa Travel Companion",
    page_icon="🏔️",
    layout="wide"
)

# ============================================================
# DATE HELPERS
# ============================================================
MONTH_TO_NUMBER = {
    "January": 1, "February": 2, "March": 3, "April": 4,
    "May": 5, "June": 6, "July": 7, "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12
}

def get_first_weekend(month_name):
    month_num   = MONTH_TO_NUMBER.get(month_name, 5)
    today       = date.today()
    year        = today.year
    if month_num < today.month:
        year += 1
    first_day       = date(year, month_num, 1)
    days_to_friday  = (4 - first_day.weekday()) % 7
    first_friday    = first_day + timedelta(days=days_to_friday)
    monday          = first_friday + timedelta(days=3)
    return first_friday, monday

# ============================================================
# SKYSCANNER URL BUILDER
# ============================================================
def build_skyscanner_url(origin_city, dest_city, depart_date, return_date, adults):
    origin_sky = get_sky_code(origin_city) or "LOND"
    dest_sky   = get_sky_code(dest_city)   or dest_city.upper()[:4]
    out_str    = depart_date.strftime("%y%m%d")
    ret_str    = return_date.strftime("%y%m%d")
    adults_int = int(adults)
    aff        = SKYSCANNER_AFFILIATE_ID

    params = f"?adults={adults_int}"
    if aff:
        params += f"&associateid={aff}"

    url = (
        f"https://www.skyscanner.net/transport/flights/"
        f"{origin_sky.lower()}/{dest_sky.lower()}/"
        f"{out_str}/{ret_str}/{params}"
    )
    return url, origin_sky, dest_sky

# ============================================================
# STYLING
# ============================================================
st.markdown("""
<style>
    /* ── Fonts ─────────────────────────────────────────────── */
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap');

    :root {
        --bg:        #0c1118;
        --bg2:       #121a24;
        --bg3:       #1a2435;
        --gold:      #c9a84c;
        --gold-dim:  rgba(201,168,76,0.18);
        --gold-line: rgba(201,168,76,0.22);
        --text:      #e8e2d9;
        --text-2:    #9eaab8;
        --text-3:    #5f7080;
        --green:     #4caf7d;
        --blue:      #4a9eda;
        --border:    rgba(255,255,255,0.07);
        --serif:     'Cormorant Garamond', Georgia, serif;
        --sans:      'Outfit', system-ui, sans-serif;
        --radius:    10px;
    }

    /* ── Reset & base ───────────────────────────────────────── */
    html, body, [class*="css"], .stMarkdown, p, div {
        font-family: var(--sans) !important;
        color: var(--text);
    }
    #MainMenu, footer, header { visibility: hidden; }
    [data-testid="stSidebar"] { display: none; }

    .stApp {
        background: var(--bg) !important;
        background-image:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(74,158,218,0.04) 0%, transparent 60%) !important;
    }

    /* ── Scrollbar ──────────────────────────────────────────── */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--gold-line); border-radius: 3px; }

    /* ── Header ─────────────────────────────────────────────── */
    .sherpa-header {
        text-align: center;
        padding: 2.4rem 0 1.8rem;
        margin-bottom: 0;
        position: relative;
    }
    .sherpa-header::after {
        content: '';
        display: block;
        width: 60px;
        height: 1px;
        background: var(--gold);
        margin: 1.2rem auto 0;
        opacity: 0.5;
    }
    .sherpa-logo {
        font-family: var(--serif) !important;
        font-size: 3.2rem;
        font-weight: 300;
        color: var(--text) !important;
        letter-spacing: 8px;
        margin: 0;
        text-transform: uppercase;
    }
    .sherpa-logo span { color: var(--gold); }
    .sherpa-tagline {
        font-family: var(--sans) !important;
        font-size: 0.72rem;
        color: var(--text-3) !important;
        letter-spacing: 4px;
        text-transform: uppercase;
        margin-top: 0.5rem;
        font-weight: 400;
    }

    /* ── Section headings ───────────────────────────────────── */
    .section-header {
        font-family: var(--serif) !important;
        font-size: 1.9rem;
        font-weight: 300;
        color: var(--text) !important;
        margin-bottom: 0.2rem;
        letter-spacing: 0.5px;
    }
    .section-sub {
        font-size: 0.72rem;
        color: var(--text-3) !important;
        letter-spacing: 3px;
        text-transform: uppercase;
        margin-bottom: 2rem;
        font-weight: 400;
    }

    /* ── Nav buttons ────────────────────────────────────────── */
    .stButton > button {
        font-family: var(--sans) !important;
        font-size: 0.78rem !important;
        font-weight: 500 !important;
        letter-spacing: 2px !important;
        text-transform: uppercase !important;
        border-radius: 4px !important;
        padding: 0.6rem 1.4rem !important;
        transition: all 0.2s ease !important;
        border: 1px solid var(--gold-line) !important;
    }
    .stButton > button[kind="primary"] {
        background: var(--gold) !important;
        color: #0c1118 !important;
        border-color: var(--gold) !important;
    }
    .stButton > button[kind="secondary"] {
        background: transparent !important;
        color: var(--text-2) !important;
    }
    .stButton > button[kind="secondary"]:hover {
        background: var(--gold-dim) !important;
        color: var(--gold) !important;
    }

    /* ── Inputs ─────────────────────────────────────────────── */
    .stTextInput input, .stTextArea textarea, .stNumberInput input,
    .stSelectbox select, [data-baseweb="select"] {
        background: var(--bg2) !important;
        border: 1px solid var(--border) !important;
        color: var(--text) !important;
        border-radius: var(--radius) !important;
        font-family: var(--sans) !important;
        font-size: 0.9rem !important;
    }
    .stTextInput input:focus, .stTextArea textarea:focus {
        border-color: var(--gold-line) !important;
        box-shadow: 0 0 0 2px rgba(201,168,76,0.08) !important;
    }
    .stRadio label, .stCheckbox label {
        font-size: 0.88rem !important;
        color: var(--text-2) !important;
    }

    /* ── Dividers ───────────────────────────────────────────── */
    hr { border: none !important; border-top: 1px solid var(--border) !important; margin: 1.8rem 0 !important; }

    /* ── Destination cards ──────────────────────────────────── */
    .dest-card {
        background: var(--bg2);
        border: 1px solid var(--border);
        border-left: 3px solid var(--gold);
        border-radius: 0 var(--radius) var(--radius) 0;
        padding: 1.6rem 1.8rem;
        margin-bottom: 1.2rem;
        transition: border-color 0.2s, background 0.2s;
    }
    .dest-card:hover { background: var(--bg3); border-color: rgba(255,255,255,0.12); border-left-color: var(--gold); }
    .dest-card h3 {
        font-family: var(--serif) !important;
        color: var(--text) !important;
        font-size: 1.55rem;
        font-weight: 400;
        margin: 0 0 0.3rem 0;
        letter-spacing: 0.3px;
    }
    .dest-card .vibe {
        font-size: 0.7rem;
        color: var(--gold) !important;
        letter-spacing: 2.5px;
        text-transform: uppercase;
        margin-bottom: 0.9rem;
        font-weight: 500;
    }
    .dest-card .summary {
        color: var(--text-2) !important;
        font-size: 0.93rem;
        line-height: 1.7;
        margin-bottom: 1.1rem;
    }
    .highlight-pill {
        display: inline-block;
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-2) !important;
        padding: 0.2rem 0.75rem;
        border-radius: 3px;
        font-size: 0.74rem;
        margin: 0.18rem;
        letter-spacing: 0.3px;
    }
    .quick-facts {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1.1rem;
        padding-top: 1.1rem;
        border-top: 1px solid var(--border);
    }
    .quick-fact {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 0.35rem 0.8rem;
        font-size: 0.8rem;
        color: var(--text-3) !important;
    }
    .quick-fact span { color: var(--text) !important; font-weight: 500; }
    .price-badge {
        background: rgba(76,175,125,0.1);
        border: 1px solid rgba(76,175,125,0.25);
        color: var(--green) !important;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 500;
        display: inline-block;
        margin-top: 0.9rem;
        letter-spacing: 0.3px;
    }
    .local-dish {
        background: var(--gold-dim);
        border: 1px solid var(--gold-line);
        border-radius: var(--radius);
        padding: 0.6rem 1rem;
        font-size: 0.86rem;
        color: var(--text-2) !important;
        margin-top: 1rem;
    }
    .local-dish strong { color: var(--gold) !important; }

    /* ── Flight / booking cards ─────────────────────────────── */
    .flight-link-card {
        background: var(--bg2);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.3rem 1.6rem;
        margin-bottom: 0.7rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        transition: border-color 0.2s;
    }
    .flight-link-card:hover { border-color: var(--gold-line); }
    .flight-link-title {
        font-size: 0.95rem;
        color: var(--text) !important;
        font-weight: 500;
        margin-bottom: 0.3rem;
        letter-spacing: 0.2px;
    }
    .flight-link-detail {
        font-size: 0.81rem;
        color: var(--text-3) !important;
        line-height: 1.6;
    }
    .flight-link-btn {
        display: inline-block;
        background: transparent;
        border: 1px solid var(--gold-line);
        color: var(--gold) !important;
        font-weight: 500;
        font-size: 0.78rem;
        padding: 0.5rem 1.2rem;
        border-radius: 4px;
        text-decoration: none !important;
        white-space: nowrap;
        letter-spacing: 1px;
        text-transform: uppercase;
        transition: all 0.2s;
    }
    .flight-link-btn:hover {
        background: var(--gold) !important;
        color: var(--bg) !important;
    }

    /* ── Chosen destination banner ──────────────────────────── */
    .chosen-banner {
        background: var(--gold-dim);
        border-left: 2px solid var(--gold);
        border-radius: 0 var(--radius) var(--radius) 0;
        padding: 0.8rem 1.2rem;
        margin-bottom: 1.8rem;
        font-size: 0.88rem;
        color: var(--text-2) !important;
    }
    .chosen-banner strong { color: var(--text) !important; }

    /* ── Auto-filled banner ─────────────────────────────────── */
    .auto-filled {
        background: rgba(76,175,125,0.06);
        border: 1px solid rgba(76,175,125,0.18);
        border-radius: var(--radius);
        padding: 0.8rem 1rem;
        font-size: 0.82rem;
        color: var(--green) !important;
        margin-bottom: 1rem;
        line-height: 1.8;
    }

    /* ── Hotel cards ────────────────────────────────────────── */
    .hotel-card {
        background: var(--bg2);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.3rem 1.5rem;
        margin-bottom: 0.9rem;
        position: relative;
        transition: border-color 0.2s;
    }
    .hotel-card:hover { border-color: rgba(255,255,255,0.14); }
    .hotel-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text) !important;
        margin-bottom: 0.18rem;
    }
    .hotel-type {
        font-size: 0.7rem;
        color: var(--gold) !important;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        margin-bottom: 0.55rem;
        font-weight: 500;
    }
    .hotel-desc {
        font-size: 0.86rem;
        color: var(--text-2) !important;
        line-height: 1.6;
        margin-bottom: 0.8rem;
    }
    .hotel-facts { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.85rem; }
    .hotel-fact {
        background: var(--bg);
        border-radius: 3px;
        padding: 0.18rem 0.55rem;
        font-size: 0.77rem;
        color: var(--text-3) !important;
        border: 1px solid var(--border);
    }
    .hotel-price {
        font-size: 0.92rem;
        font-weight: 600;
        color: var(--green) !important;
        margin-bottom: 0.85rem;
    }
    .hotel-book-btn {
        display: inline-block;
        background: transparent;
        border: 1px solid rgba(74,158,218,0.4);
        color: var(--blue) !important;
        text-decoration: none !important;
        padding: 0.42rem 1rem;
        border-radius: 4px;
        font-size: 0.78rem;
        font-weight: 500;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        transition: all 0.2s;
    }
    .hotel-book-btn:hover {
        background: var(--blue) !important;
        color: var(--bg) !important;
    }
    .hotel-badge {
        position: absolute;
        top: 1rem; right: 1.2rem;
        background: var(--gold-dim);
        border: 1px solid var(--gold-line);
        color: var(--gold) !important;
        font-size: 0.68rem;
        padding: 0.12rem 0.45rem;
        border-radius: 3px;
        letter-spacing: 0.8px;
        text-transform: uppercase;
    }

    /* ── Itinerary cards ────────────────────────────────────── */
    .day-card {
        background: var(--bg2);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.5rem 1.7rem;
        margin-bottom: 1rem;
        position: relative;
    }
    .day-card::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 2px;
        background: var(--gold);
        border-radius: 2px 0 0 2px;
        opacity: 0.5;
    }
    .day-header {
        font-family: var(--serif) !important;
        font-size: 1.2rem;
        font-weight: 400;
        color: var(--text) !important;
        border-bottom: 1px solid var(--border);
        padding-bottom: 0.65rem;
        margin-bottom: 1.1rem;
        letter-spacing: 0.3px;
    }
    .day-section { margin-bottom: 1rem; }
    .day-section-label {
        font-size: 0.68rem;
        font-weight: 600;
        color: var(--gold) !important;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 0.3rem;
    }
    .day-section-text {
        font-size: 0.89rem;
        color: var(--text-2) !important;
        line-height: 1.7;
    }
    .itinerary-meta {
        background: var(--bg);
        border-radius: var(--radius);
        padding: 1.1rem 1.4rem;
        margin-bottom: 1rem;
        border: 1px solid var(--border);
    }
    .itinerary-meta h4 {
        color: var(--text-3) !important;
        font-size: 0.72rem;
        margin-bottom: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        font-weight: 500;
    }
    .cost-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.86rem;
        color: var(--text-2) !important;
        padding: 0.18rem 0;
    }
    .cost-total {
        color: var(--green) !important;
        font-weight: 600;
        border-top: 1px solid var(--border);
        margin-top: 0.4rem;
        padding-top: 0.4rem;
    }
    .tip-item {
        font-size: 0.86rem;
        color: var(--text-2) !important;
        padding: 0.4rem 0;
        border-bottom: 1px solid var(--border);
        line-height: 1.5;
    }
    .tip-item:last-child { border-bottom: none; }

    /* ── Chat messages ──────────────────────────────────────── */
    .chat-message {
        padding: 0.85rem 1.1rem;
        border-radius: var(--radius);
        margin-bottom: 0.6rem;
        font-size: 0.9rem;
        line-height: 1.6;
    }
    .chat-user {
        background: var(--gold-dim);
        border: 1px solid var(--gold-line);
        color: var(--text) !important;
        margin-left: 2.5rem;
    }
    .chat-sherpa {
        background: var(--bg2);
        border: 1px solid var(--border);
        color: var(--text-2) !important;
        margin-right: 2.5rem;
    }
    .chat-label {
        font-size: 0.68rem;
        letter-spacing: 2px;
        text-transform: uppercase;
        margin-bottom: 0.3rem;
        color: var(--text-3) !important;
    }

    /* ── Trip type checkboxes ───────────────────────────────── */
    div[data-testid="stCheckbox"] {
        background: var(--bg2);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.55rem 0.6rem;
        transition: all 0.15s;
        cursor: pointer;
        text-align: center;
    }
    div[data-testid="stCheckbox"]:has(input:checked) {
        background: var(--gold-dim);
        border-color: var(--gold-line);
    }
    div[data-testid="stCheckbox"] label {
        color: var(--text-2) !important;
        font-size: 0.87rem !important;
        cursor: pointer;
        width: 100%;
        justify-content: center;
    }
    div[data-testid="stCheckbox"]:has(input:checked) label {
        color: var(--gold) !important;
        font-weight: 500 !important;
    }
    div[data-testid="stCheckbox"] input[type="checkbox"] { display: none !important; }

    /* ── Spinners & misc ────────────────────────────────────── */
    .stSpinner > div { border-top-color: var(--gold) !important; }
    .stAlert { border-radius: var(--radius) !important; }
    [data-testid="stExpander"] {
        background: var(--bg2) !important;
        border: 1px solid var(--border) !important;
        border-radius: var(--radius) !important;
    }
    .stDateInput input { color: var(--text) !important; }
    .stMarkdown a { color: var(--gold) !important; }
    .stMarkdown a:hover { color: var(--text) !important; }

</style>
"""
, unsafe_allow_html=True)

# ============================================================
# SESSION STATE
# ============================================================
defaults = {
    "active_tab":         "Inspire",
    "chosen_destination": None,
    "inspire_results":    None,
    "book_results":       None,
    "support_results":    None,
    "chat_history":       [],
    "user_profile":       {},
    "flight_details":     {},
    "maps_csv":           None,
    "map_locations":      None,
    "hotel_results":      None,
    "car_hire_rating":    None,  # list of AI-recommended hotel dicts
    "car_hire_confirmed": None,  # None = unanswered, "yes" = hiring, "no" = not hiring
    "dest_preference":    "",    # optional destination hint (city/country/region)
    "selected_hotel":     None,  # name of chosen accommodation
    "travel_dates":       {},    # {mode, specific_depart, specific_return, month}
    "transport_mode":     "🚗 I'm flexible — willing to rent a car",
}
for k, v in defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v

# ============================================================
# PERSISTENT DEPARTURE CITY (localStorage)
# ============================================================
# Inject a tiny JS component that reads localStorage on load and
# writes it back whenever the departure city changes.
# We use a hidden component to bridge JS → Python via query params.

_stored_city = st.query_params.get("home_city", "")
if _stored_city and not st.session_state.user_profile.get("starting_point"):
    st.session_state.user_profile["starting_point"] = _stored_city

# JS that reads localStorage and sets the query param on first load
st.components.v1.html("""
<script>
(function() {
  const saved = localStorage.getItem('sherpa_home_city');
  if (saved) {
    const url = new URL(window.parent.location.href);
    if (url.searchParams.get('home_city') !== saved) {
      url.searchParams.set('home_city', saved);
      window.parent.history.replaceState({}, '', url.toString());
      // Trigger Streamlit re-read of query params
      window.parent.dispatchEvent(new Event('popstate'));
    }
  }
})();
</script>
""", height=0)

# ============================================================
# HEADER
# ============================================================
st.markdown("""
<div class="sherpa-header">
    <p class="sherpa-logo">S<span>H</span>ERPA</p>
    <p class="sherpa-tagline">Your Expert Travel Companion</p>
</div>
""", unsafe_allow_html=True)

# ============================================================
# TAB NAVIGATION
# ============================================================
c1, c2, c3 = st.columns(3)
with c1:
    if st.button("✨  Inspire", use_container_width=True,
                 type="primary" if st.session_state.active_tab == "Inspire" else "secondary"):
        st.session_state.active_tab = "Inspire"
        st.rerun()
with c2:
    if st.button("🗓️  Book", use_container_width=True,
                 type="primary" if st.session_state.active_tab == "Book" else "secondary"):
        st.session_state.active_tab = "Book"
        st.rerun()
with c3:
    if st.button("🧭  Support", use_container_width=True,
                 type="primary" if st.session_state.active_tab == "Support" else "secondary"):
        st.session_state.active_tab = "Support"
        st.rerun()

st.markdown("---")

claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ============================================================
# ✨  INSPIRE TAB
# ============================================================
if st.session_state.active_tab == "Inspire":

    st.markdown('<p class="section-header">Find Your Destination</p>', unsafe_allow_html=True)
    st.markdown('<p class="section-sub">TELL US WHAT YOU LOVE AND WE\'LL FIND THE PERFECT ESCAPE</p>',
                unsafe_allow_html=True)

    # Pull stored values so the form remembers previous inputs
    saved = st.session_state.user_profile

    # ── Preferences expander ───────────────────────────────────
    with st.expander("🎒 Your Travel Preferences", expanded=not bool(st.session_state.inspire_results)):

        col_a, col_b = st.columns(2)

        with col_a:
            starting_point = st.text_input(
                "📍 Departing from",
                placeholder="e.g. London, Manchester",
                value=saved.get("starting_point", _stored_city or "")
            )
            # Save to localStorage whenever the value changes
            if starting_point:
                st.components.v1.html(f"""
<script>
(function() {{
  const city = {repr(starting_point)};
  if (localStorage.getItem('sherpa_home_city') !== city) {{
    localStorage.setItem('sherpa_home_city', city);
    const url = new URL(window.parent.location.href);
    url.searchParams.set('home_city', city);
    window.parent.history.replaceState({{}}, '', url.toString());
  }}
}})();
</script>
""", height=0)
            st.markdown("**📅 When are you thinking of going?**")
            _saved_dates  = st.session_state.get("travel_dates", {})
            _date_mode    = st.radio(
                "Date preference",
                ["📆 Specific dates", "🗓️ Flexible — whole month"],
                index=0 if _saved_dates.get("mode") == "specific" else 1,
                horizontal=True,
                label_visibility="collapsed",
                key="date_mode_radio"
            )

            if _date_mode == "📆 Specific dates":
                _today = date.today()
                _saved_dep = _saved_dates.get("specific_depart", _today)
                _saved_ret = _saved_dates.get("specific_return", _today)
                # Ensure saved values are date objects
                if not hasattr(_saved_dep, "strftime"):
                    _saved_dep = _today
                if not hasattr(_saved_ret, "strftime"):
                    _saved_ret = _today

                _dc1, _dc2 = st.columns(2)
                with _dc1:
                    _specific_depart = st.date_input(
                        "Outbound", value=_saved_dep,
                        min_value=_today, key="inspire_depart"
                    )
                with _dc2:
                    _specific_return = st.date_input(
                        "Return", value=max(_saved_ret, _specific_depart),
                        min_value=_specific_depart, key="inspire_return"
                    )
                travel_month = _specific_depart.strftime("%B")  # for prompt compatibility
                st.session_state["travel_dates"] = {
                    "mode":            "specific",
                    "specific_depart": _specific_depart,
                    "specific_return": _specific_return,
                    "month":           travel_month,
                }
            else:
                _specific_depart = None
                _specific_return = None
                travel_month = st.selectbox(
                    "Month",
                    ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"],
                    index=MONTH_TO_NUMBER.get(saved.get("travel_month","May"), 5) - 1,
                    label_visibility="collapsed",
                    key="inspire_month"
                )
                st.session_state["travel_dates"] = {
                    "mode":  "flexible",
                    "month": travel_month,
                    "specific_depart": None,
                    "specific_return": None,
                }
            budget_per_person = st.selectbox(
                "💰 Budget",
                ["£ — Budget", "££ — Mid-range", "£££ — Luxury"],
                index=["£ — Budget", "££ — Mid-range", "£££ — Luxury"].index(
                    saved.get("budget","££ — Mid-range")
                )
            )

        with col_b:
            group_type = st.selectbox(
                "👥 Travelling as",
                ["Solo","Couple","Friends Group","Family with Kids"],
                index=["Solo","Couple","Friends Group","Family with Kids"].index(
                    saved.get("group_type","Couple")
                )
            )
            st.markdown("**🌍 Type of trip** *(select all that apply)*")
            _saved_types = saved.get("trip_type", [])
            _bt1, _bt2, _bt3 = st.columns(3)
            _cb_city = _bt1.checkbox("🏙️ City Break",  value="City Break"  in _saved_types, key="tt_city")
            _cb_coun = _bt2.checkbox("🌿 Countryside",  value="Countryside" in _saved_types, key="tt_coun")
            _cb_beac = _bt3.checkbox("🏖️ Beach",        value="Beach"       in _saved_types, key="tt_beac")
            trip_type = (
                (["City Break"]  if _cb_city else []) +
                (["Countryside"] if _cb_coun else []) +
                (["Beach"]       if _cb_beac else [])
            )
            _saved_transport = saved.get("transport_mode", st.session_state.get("transport_mode", "🚗 I'm flexible — willing to rent a car"))
            _transport_opts = [
                "🚗 I'm flexible — willing to rent a car",
                "🚇 Public transport only",
            ]
            _car_default_idx = 0 if "willing to rent" in _saved_transport else 1
            transport_mode = st.radio(
                "🚗 Getting around",
                _transport_opts,
                index=_car_default_idx,
                key="tr_hire_car"
            )
            st.session_state["transport_mode"] = transport_mode

            user_priorities = st.text_area(
                "⭐ What makes your perfect trip?",
                placeholder="e.g. Great food, local markets, avoiding tourist traps...",
                height=108,
                value=saved.get("priorities","")
            )

    # ── Optional destination preference ──────────────────────────
    _dest_pref_cols = st.columns([1, 2, 1])
    with _dest_pref_cols[1]:
        _dest_pref = st.text_input(
            "🗺️ Have a destination in mind? *(optional)*",
            placeholder="e.g. Portugal, Andalusia, Barcelona — leave blank for surprise suggestions",
            value=st.session_state.get("dest_preference", ""),
            help="Enter a city for one focused suggestion, a region or country for up to three options within that area."
        )
        st.session_state["dest_preference"] = _dest_pref

    # Always save current preferences to session state
    st.session_state.user_profile = {
        "starting_point":  starting_point,
        "trip_type":       trip_type,
        "budget":          budget_per_person,
        "group_type":      group_type,
        "priorities":      user_priorities,
        "travel_month":    travel_month,
        "transport_mode":  transport_mode,
    }
    # Keep travel_dates in sync with profile
    if st.session_state.get("travel_dates",{}).get("mode") == "specific":
        st.session_state.user_profile["specific_depart"] = st.session_state["travel_dates"].get("specific_depart")
        st.session_state.user_profile["specific_return"] = st.session_state["travel_dates"].get("specific_return")

    # ── Validate ───────────────────────────────────────────────
    _dest_pref_entered = bool(st.session_state.get("dest_preference", "").strip())
    if not starting_point:
        st.info("👆 Open **Your Travel Preferences** above, fill in your details, then hit Inspire Me!")
    elif not trip_type and not _dest_pref_entered:
        st.warning("Please select at least one trip type, or enter a destination above.")
    else:
        if st.button("✨ Inspire Me!", use_container_width=False):
            with st.spinner("Sherpa is searching the globe for your perfect destinations..."):
                try:
                    trip_type_text  = " / ".join(trip_type) if trip_type else "Any — match the destination"
                    priorities_text = user_priorities or "no specific preferences given"

                    _dest_pref_val = st.session_state.get("dest_preference", "").strip()

                    # Work out how many destinations to suggest and the focus instruction
                    if _dest_pref_val:
                        _dest_lower  = _dest_pref_val.lower()
                        _dest_words  = _dest_pref_val.split()

                        # Countries and regions that should return 3 results
                        _known_regions = [
                            "portugal","spain","france","italy","greece","turkey","croatia",
                            "morocco","japan","thailand","iceland","ireland","scotland","wales",
                            "andalusia","andalucia","algarve","tuscany","sicily","corsica",
                            "provence","catalonia","basque","riviera","balkans","scandinavia",
                            "caribbean","southeast asia","central america","south america",
                            "greek islands","canary islands","balearic islands","azores","madeira",
                            "uk","england","europe","asia","africa","americas",
                        ]
                        _is_region = any(r in _dest_lower for r in _known_regions)

                        # Treat as a specific city if not a known region and 1-3 words
                        _is_likely_city = (
                            not _is_region
                            and len(_dest_words) <= 3
                        )

                        if _is_likely_city:
                            _n_dest     = 1
                            _dest_instr = (
                                f"The traveller specifically wants to visit {_dest_pref_val}. "
                                f"Return EXACTLY 1 destination card for {_dest_pref_val} only. "
                                f"Do NOT suggest alternative cities. Do NOT return 2 or 3 options."
                            )
                        else:
                            _n_dest     = 3
                            _dest_instr = (
                                f"The traveller is interested in {_dest_pref_val}. "
                                f"Suggest up to 3 destinations WITHIN or directly related to {_dest_pref_val} "
                                f"— do not go outside this area. Choose the most distinct and interesting options "
                                f"within {_dest_pref_val} that match their profile."
                            )
                    else:
                        _n_dest     = 3
                        _dest_instr = "Suggest 3 destinations from anywhere in the world that best match the traveller's profile."

                    prompt = f"""
You are Sherpa, an expert international travel guide. You MUST suggest EXACTLY {_n_dest} weekend destination option{"s" if _n_dest > 1 else ""}.

DESTINATION FOCUS: {_dest_instr}

TRAVELLER PROFILE:
- Departing from: {starting_point}
- Travel dates: {
    (st.session_state.get("travel_dates",{}).get("specific_depart").strftime("%d %B") + " – " +
     st.session_state.get("travel_dates",{}).get("specific_return").strftime("%d %B %Y"))
    if st.session_state.get("travel_dates",{}).get("mode") == "specific"
    else travel_month
}
- Trip type: {trip_type_text}
- Budget tier: {budget_per_person}
  (£ = budget traveller, hostels/cheap eats/budget airlines, total under £300pp;
   ££ = mid-range, 3-star hotels/sit-down restaurants, total £300–£700pp;
   £££ = luxury, 4-5 star hotels/fine dining/flexible flights, total £700pp+)
- Recommend destinations, airlines, restaurants and activities that match this budget tier exactly
- Travelling as: {group_type}
- What they love: {priorities_text}
- Getting around: {transport_mode}
{"- IMPORTANT: This traveller wants PUBLIC TRANSPORT ONLY. Strongly prioritise destinations with excellent metro/rail/bus networks from the airport into the centre. Avoid destinations where a car is needed to reach the best attractions. Favour compact, walkable cities with good transit." if "Public transport" in transport_mode else "- The traveller is open to car hire. Mix of city and more rural/scenic destinations is fine."}

For EACH destination structure EXACTLY like this with no deviation:

---DESTINATION---
NAME: [City, Country]
VIBE: [3 evocative words e.g. Soulful · Historic · Delicious]
SUMMARY: [2-3 sentences painting a vivid picture of why this place is perfect for this traveller]
HIGHLIGHTS: [activity 1] | [activity 2] | [activity 3] | [activity 4]
FLIGHT: [X]–[X] hrs from {starting_point} | [Example airline] | [Departure airport e.g. STN, LHR]
AIRPORT: [Nearest airport name and IATA code e.g. Lisbon Humberto Delgado Airport (LIS)]
TRANSFER: [Transfer time and mode from airport to destination e.g. 35 min by metro | £X–£X. If public transport only traveller, always specify public transport option first]
WEATHER: [Expected weather in {travel_month} e.g. 24°C, warm and sunny — use specific dates if provided]
MEAL: £[X]–£[X] per person at a mid-range restaurant
PINT: £[X]–£[X] for a local beer or equivalent drink
DISH: [The single most iconic local food dish with a one-line description e.g. Pastel de nata — flaky custard tart, best eaten warm from the oven]
PRICE: £[X]–£[X] per person for the whole weekend inc. flights
WHY_YOU: [One sentence referencing their specific preferences and group type]
---END---

Rules:
- You MUST return exactly {_n_dest} destination(s) as specified above — returning a different number is not acceptable
- Strictly honour the DESTINATION FOCUS instruction above — do not go outside the specified area if one is given
- All destinations must be foreign (outside UK)
- Each must be genuinely different in character
- Match the trip type: {trip_type_text}
- Keep all costs realistic for {travel_month} 2025/2026
- Weather must be specific to {travel_month}
- CRITICAL: NAME must always be a specific CITY or TOWN — never a region, area or
  coastline. Use "Seville" not "Andalusia", "Faro" not "Algarve", "Palma" not
  "Mallorca", "Heraklion" not "Crete". The city name is used to look up flights
  so it must be a real city with its own airport or clear gateway city.
- IMPORTANT: Strongly prefer destinations with frequent direct flights or very short
  1-stop connections from {starting_point}. Avoid destinations requiring long layovers
  — this is a weekend trip so travel time is precious.
"""
                    message = claude_client.messages.create(
                        model="claude-sonnet-4-6",
                        max_tokens=1800,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    st.session_state.inspire_results    = message.content[0].text
                    st.session_state.chosen_destination = None
                    st.session_state.car_hire_rating    = None
                    st.session_state.car_hire_confirmed = None
                    st.session_state.book_results       = None
                    st.session_state.support_results    = None
                    st.session_state.hotel_results      = None
                    st.session_state.chat_history       = []

                except Exception as e:
                    st.error(f"Something went wrong: {e}")

    # ── Destination cards ──────────────────────────────────────
    if st.session_state.inspire_results:
        raw          = st.session_state.inspire_results
        destinations = []

        for block in raw.split("---DESTINATION---"):
            if "---END---" not in block:
                continue
            d = {}
            for line in block.split("---END---")[0].strip().split("\n"):
                line = line.strip()
                for key in ["NAME","VIBE","SUMMARY","FLIGHT","AIRPORT","TRANSFER","WEATHER","MEAL","PINT","DISH","PRICE","WHY_YOU"]:
                    if line.startswith(f"{key}:"):
                        d[key.lower()] = line[len(key)+1:].strip()
                if line.startswith("HIGHLIGHTS:"):
                    d["highlights"] = [h.strip() for h in line[11:].strip().split("|")]
            if d:
                destinations.append(d)

        if destinations:
            _n_shown = len(destinations)
            _area_label = f" in {st.session_state.get('dest_preference','')}" if st.session_state.get("dest_preference") else ""
            _escape_heading = "Your Weekend Escape" if _n_shown == 1 else f"Your {_n_shown} Weekend Escapes"
            st.markdown(f"### {_escape_heading}{_area_label}")
            for i, d in enumerate(destinations):
                pills = "".join(
                    f'<span class="highlight-pill">✦ {h}</span>'
                    for h in d.get("highlights",[])
                )
                transfer_html = f'<div class="quick-fact">🚌 &nbsp;Transfer: <span>{d.get("transfer","")}</span></div>' if d.get("transfer") else ""
                airport_html  = f'<div class="quick-fact">🛬 &nbsp;<span>{d.get("airport","")}</span></div>' if d.get("airport") else ""
                dish_html     = f'<div class="local-dish">🍴 <strong>Must try:</strong> {d.get("dish","")}</div>' if d.get("dish") else ""
                _card_title = d.get('name','') if _n_shown == 1 else f"Option {i+1}: {d.get('name','')}"
                st.markdown(f"""
<div class="dest-card">
    <h3>{_card_title}</h3>
    <div class="vibe">{d.get('vibe','')}</div>
    <p class="summary">{d.get('summary','')}</p>
    <div>{pills}</div>
    <div class="quick-facts">
        <div class="quick-fact">✈️ &nbsp;<span>{d.get('flight','')}</span></div>
        {airport_html}
        {transfer_html}
        <div class="quick-fact">🌤️ &nbsp;<span>{d.get('weather','')}</span></div>
        <div class="quick-fact">🍽️ &nbsp;Meal out: <span>{d.get('meal','')}</span></div>
        <div class="quick-fact">🍺 &nbsp;Pint: <span>{d.get('pint','')}</span></div>
    </div>
    {dish_html}
    <div class="price-badge">💰 Weekend total: {d.get('price','')}</div>
    <br>
    <em style="color:#6a7d94;font-size:0.85rem;">💬 {d.get('why_you','')}</em>
</div>
""", unsafe_allow_html=True)

                if st.button(f"Choose {d.get('name','')} →", key=f"choose_{i}"):
                    st.session_state.chosen_destination = d.get("name","")
                    st.session_state.active_tab         = "Book"
                    st.rerun()
                st.markdown("")
        else:
            st.markdown(st.session_state.inspire_results)

# ============================================================
# 🗓️  BOOK TAB
# ============================================================
elif st.session_state.active_tab == "Book":

    st.markdown('<p class="section-header">Plan Your Trip</p>', unsafe_allow_html=True)
    st.markdown('<p class="section-sub">FLIGHTS · ACCOMMODATION · ACTIVITIES · FULL ITINERARY</p>',
                unsafe_allow_html=True)

    profile = st.session_state.user_profile

    # ── Destination selector ───────────────────────────────────
    if not st.session_state.chosen_destination:
        st.markdown("#### Where do you want to go?")
        tab_inspire, tab_manual = st.tabs(["✨ Choose from Inspire", "✏️ Type a destination"])

        with tab_inspire:
            st.info("Head to the **✨ Inspire** tab to get 3 personalised suggestions, "
                    "then click **Choose** to send it straight here.")

        with tab_manual:
            dest_input = st.text_input(
                "Type your destination",
                placeholder="e.g. Lisbon, Portugal",
                label_visibility="collapsed"
            )
            if dest_input and st.button("Let's go →"):
                st.session_state.chosen_destination = dest_input
                st.rerun()

    if st.session_state.chosen_destination:
        dest      = st.session_state.chosen_destination
        dest_city = dest.split(",")[0].strip()

        # Normalise region names to their gateway airport city so the
        # airport lookup returns specific airports rather than vague regions.
        _REGION_GATEWAY = {
            "algarve":            "Faro",
            "costa del sol":      "Malaga",
            "andalusia":          "Malaga",
            "andalucia":          "Malaga",
            "catalonia":          "Barcelona",
            "tuscany":            "Florence",
            "toscana":            "Florence",
            "provence":           "Marseille",
            "cote d'azur":       "Nice",
            "french riviera":     "Nice",
            "amalfi coast":       "Naples",
            "sicily":             "Palermo",
            "sardinia":           "Cagliari",
            "crete":              "Heraklion",
            "corfu":              "Corfu",
            "rhodes":             "Rhodes",
            "mykonos":            "Mykonos",
            "santorini":          "Santorini",
            "ibiza":              "Ibiza",
            "mallorca":           "Palma",
            "majorca":            "Palma",
            "menorca":            "Mahon",
            "tenerife":           "Tenerife South",
            "lanzarote":          "Lanzarote",
            "fuerteventura":      "Fuerteventura",
            "gran canaria":       "Las Palmas",
            "madeira":            "Funchal",
            "azores":             "Ponta Delgada",
            "balearic islands":   "Palma",
            "canary islands":     "Las Palmas",
            "lake district":      "Manchester",
            "cotswolds":          "Birmingham",
            "peak district":      "Manchester",
            "highlands":          "Inverness",
            "scottish highlands": "Inverness",
            "dordogne":           "Bordeaux",
            "normandy":           "Paris",
            "brittany":           "Nantes",
            "loire valley":       "Tours",
            "alps":               "Geneva",
            "french alps":        "Geneva",
            "italian alps":       "Milan",
            "dolomites":          "Venice",
            "black forest":       "Stuttgart",
            "bavarian alps":      "Munich",
            "dalmatian coast":    "Split",
            "istria":             "Pula",
            "alentejo":           "Lisbon",
            "douro valley":       "Porto",
        }
        _gateway = _REGION_GATEWAY.get(dest_city.lower())
        _airport_lookup_city = _gateway if _gateway else dest_city

        # If the user jumped to Book without Inspire, collect essentials inline
        if not profile.get("starting_point"):
            with st.expander("🎒 Quick preferences needed", expanded=True):
                qa, qb, qc = st.columns(3)
                with qa:
                    sp = st.text_input("📍 Departing from", placeholder="e.g. London")
                with qb:
                    tm = st.selectbox("📅 Travel month",
                        ["January","February","March","April","May","June",
                         "July","August","September","October","November","December"], index=4)
                with qc:
                    gt = st.selectbox("👥 Travelling as",
                        ["Solo","Couple","Friends Group","Family with Kids"], index=1)
                bp = st.selectbox("💰 Budget",
                    ["£ — Budget", "££ — Mid-range", "£££ — Luxury"], index=1)
                if sp and st.button("Save preferences"):
                    st.session_state.user_profile.update({
                        "starting_point": sp, "travel_month": tm,
                        "group_type": gt, "budget": bp,
                        "trip_type": ["City Break"], "priorities": "",
                    })
                    profile = st.session_state.user_profile
                    st.rerun()

        origin_city  = profile.get("starting_point","")
        travel_month = profile.get("travel_month","May")

        st.markdown(
            f'<div class="chosen-banner">📍 Planning your trip to <strong>{dest}</strong>'
            f' in <strong>{travel_month}</strong></div>',
            unsafe_allow_html=True
        )

        # Use specific dates from Inspire if set, else fall back to first weekend of month
        _tdates       = st.session_state.get("travel_dates", {})
        _has_specific = _tdates.get("mode") == "specific" and _tdates.get("specific_depart")
        auto_friday, auto_monday = get_first_weekend(travel_month)
        _default_depart = _tdates["specific_depart"] if _has_specific else auto_friday
        _default_return = _tdates["specific_return"] if _has_specific else auto_monday

        # ── Flight finder ──────────────────────────────────────
        st.markdown("### ✈️ Find Flights")

        if _has_specific:
            st.success(
                f"📆 Using your selected dates: "
                f"**{_default_depart.strftime('%a %d %b')} → {_default_return.strftime('%a %d %b %Y')}** "
                f"— adjust below if needed"
            )

        col1, col2, col3 = st.columns(3)
        with col1:
            depart_date = st.date_input("Outbound date",
                                        value=_default_depart, min_value=date.today())
        with col2:
            return_date = st.date_input("Return date",
                                        value=_default_return, min_value=date.today())
        with col3:
            group       = profile.get("group_type","Couple")
            default_pax = 2 if group in ["Couple","Friends Group","Family with Kids"] else 1
            num_adults  = st.number_input("Passengers", min_value=1, max_value=9,
                                          value=default_pax, step=1)

        # Resolve destination airports — returns a list, ordered by transfer time
        # Each item: {iata, sky, airport_name, transfer_label, transfer_mins, uk_note}
        # Resolve airports — cache in session state keyed by dest_city so it
        # survives reruns without hitting the API again
        _ap_cache_key = f"_airports_{dest_city.lower()}"
        if not st.session_state.get(_ap_cache_key):
            dest_airports_raw = get_nearest_airport(_airport_lookup_city, claude_client)
            if isinstance(dest_airports_raw, dict):
                dest_airports = [dest_airports_raw]
            elif isinstance(dest_airports_raw, list):
                dest_airports = dest_airports_raw
            else:
                dest_airports = []
            st.session_state[_ap_cache_key] = dest_airports
        else:
            dest_airports = st.session_state[_ap_cache_key]

        st.session_state["_dest_airport_info"] = dest_airports[0] if dest_airports else {}

        origin_iatas    = get_iata_codes(origin_city)
        origin_sky      = get_sky_code(origin_city) or "LOND"
        origin_iata_str = ", ".join(origin_iatas) if origin_iatas else origin_sky

        # Patch any unknown dest airports into CITY_AIRPORTS so URL builder can find them
        from airports import CITY_AIRPORTS
        for ap in dest_airports:
            if ap.get("iata") and ap["iata"] not in get_iata_codes(dest_city):
                CITY_AIRPORTS.setdefault(dest_city.lower(), {"iata": [], "sky": ap.get("sky","")})
                if ap["iata"] not in CITY_AIRPORTS[dest_city.lower()]["iata"]:
                    CITY_AIRPORTS[dest_city.lower()]["iata"].append(ap["iata"])

        # Route summary banner
        airport_summary = " · ".join(
            f"{ap.get('iata','?')} ({ap.get('transfer_label','?')} to centre)"
            for ap in dest_airports
        )
        st.markdown(f"""
<div class="auto-filled">
    🤖 <strong>Sherpa has identified your route:</strong><br>
    ✈️ From <strong>{origin_city.title()}</strong> — airports: {origin_iata_str}<br>
    🛬 To <strong>{dest_city.title()}</strong> — {len(dest_airports)} airport option{"s" if len(dest_airports) > 1 else ""}: {airport_summary}<br>
    📅 <strong>{depart_date.strftime("%a %d %b")} → {return_date.strftime("%a %d %b %Y")}</strong>
    &nbsp;· {int(num_adults)} passenger(s)
</div>
""", unsafe_allow_html=True)

        # One Skyscanner card per airport option
        if len(dest_airports) > 1:
            st.markdown(f"**{len(dest_airports)} airports serve {dest_city} from the UK — choose the best option for you:**")

        for ap in dest_airports:
            ap_iata     = ap.get("iata","")
            ap_sky      = ap.get("sky", ap_iata)
            ap_name     = ap.get("airport_name") or ap_iata
            ap_transfer = ap.get("transfer_label","")
            ap_uk_note  = ap.get("uk_note","")

            # Build this airport's Skyscanner URL directly
            out_str    = depart_date.strftime("%y%m%d")
            ret_str    = return_date.strftime("%y%m%d")
            adults_int = int(num_adults)
            aff        = SKYSCANNER_AFFILIATE_ID
            params     = f"?adults={adults_int}" + (f"&associateid={aff}" if aff else "")
            sky_url    = (
                f"https://www.skyscanner.net/transport/flights/"
                f"{origin_sky.lower()}/{ap_sky.lower()}/"
                f"{out_str}/{ret_str}/{params}"
            )

            uk_detail   = f"&nbsp;·&nbsp;{ap_uk_note}" if ap_uk_note else ""

            # Build transfer detail — use legs if available, fall back to label
            ap_legs = ap.get("transfer_legs") or []
            if ap_legs:
                # Individual legs with times + overall total
                leg_parts = []
                for leg in ap_legs:
                    mode   = leg.get("mode", "")
                    mins   = leg.get("mins", "")
                    detail = leg.get("detail", "")
                    icon   = {"Train":"🚆","Metro":"🚇","Bus":"🚌","Taxi":"🚕","Walk":"🚶","Ferry":"⛴️","Tram":"🚊","Shuttle":"🚐"}.get(mode, "🚌")
                    mins_str = f"{mins} min" if mins else ""
                    leg_parts.append(f"{icon} {mode} {mins_str}" + (f" <span style='color:#8a9bb0'>({detail})</span>" if detail else ""))
                total_mins = ap.get("transfer_mins","")
                total_str  = f"<span style='color:#d4af37;font-weight:600'>{total_mins} min total</span>" if total_mins else ""
                transfer_detail = (
                    "🚌 Transfer to destination: " + total_str + "<br>"
                    + "&nbsp;&nbsp;&nbsp;" + " → ".join(leg_parts)
                )
            elif ap_transfer:
                transfer_detail = f"🚌 {ap_transfer} to destination"
            else:
                transfer_detail = ""

            st.markdown(
                '<div class="flight-link-card"><div>'
                f'<div class="flight-link-title">✈️ {origin_city.title()} → {ap_name}</div>'
                '<div class="flight-link-detail">'
                f'{ap_iata} · {depart_date.strftime("%d %b")} outbound'
                f' · {return_date.strftime("%d %b")} return'
                f' · {adults_int} passenger(s)<br>'
                f'{transfer_detail}{uk_detail}'
                '</div></div>'
                f'<a href="{sky_url}" target="_blank" class="flight-link-btn">Search Skyscanner →</a>'
                '</div>',
                unsafe_allow_html=True
            )

        # Use primary airport's transfer for the itinerary
        primary_ap     = dest_airports[0] if dest_airports else {}
        transfer_label = primary_ap.get("transfer_label")
        sky_url        = (  # keep sky_url defined for the Book Now links below
            f"https://www.skyscanner.net/transport/flights/"
            f"{origin_sky.lower()}/{primary_ap.get('sky', dest_city[:4]).lower()}/"
            f"{depart_date.strftime('%y%m%d')}/{return_date.strftime('%y%m%d')}/"
            f"?adults={int(num_adults)}"
            + (f"&associateid={SKYSCANNER_AFFILIATE_ID}" if SKYSCANNER_AFFILIATE_ID else "")
        )

        # ── Confirm flight details ─────────────────────────────
        st.markdown("---")
        st.markdown("### 🛫 Confirm Your Flight Times")
        st.markdown(
            "*Once you've booked, enter your arrival and departure times so Sherpa "
            "can build your itinerary precisely around your schedule.*"
        )

        fd = st.session_state.flight_details

        # Airport selector — always visible OUTSIDE the expander
        # Pull from session state cache which persists across reruns
        _ap_cache_key = f"_airports_{dest_city.lower()}"
        _all_airports = st.session_state.get(_ap_cache_key) or dest_airports or []

        # Clean label helper: "Lisbon Airport (LIS) — 35 min by metro"
        def _ap_label(ap):
            name     = ap.get("airport_name") or ap.get("iata", "?")
            iata     = ap.get("iata", "?")
            transfer = ap.get("transfer_label", "")
            return f"{name} ({iata}){' — ' + transfer if transfer else ''}"

        # Always show airport selector (single = info display, multiple = dropdown)
        if len(_all_airports) > 1:
            _ap_options     = {_ap_label(ap): ap for ap in _all_airports}
            _saved_label    = fd.get("selected_airport_label", "")
            _ap_labels      = list(_ap_options.keys())
            _ap_default_idx = next(
                (i for i, l in enumerate(_ap_labels) if l == _saved_label), 0
            )
            _selected_ap_label = st.selectbox(
                "🛬 Which airport are you flying into?",
                _ap_labels,
                index=_ap_default_idx,
                key="fd_airport_select",
                help="Select the airport you booked or plan to fly into"
            )
            _selected_ap = _ap_options[_selected_ap_label]
        elif _all_airports:
            _selected_ap       = _all_airports[0]
            _selected_ap_label = _ap_label(_all_airports[0])
            st.info(f"🛬 Flying into: **{_selected_ap_label}**")
        else:
            _selected_ap       = {}
            _selected_ap_label = ""


        # Expander title shows summary once confirmed
        if fd.get("confirmed"):
            expander_label = (
                f"✅ Flights confirmed  ·  "
                f"Arrive {fd.get('arrival_time','')} on "
                f"{fd['outbound_date'].strftime('%a %d %b') if fd.get('outbound_date') else 'Friday'}"
                f"  ·  Depart {fd.get('depart_dest_time','')} on "
                f"{fd['return_date'].strftime('%a %d %b') if fd.get('return_date') else 'Monday'}"
            )
        else:
            expander_label = "✈️ Enter your arrival and departure times"

        with st.expander(expander_label, expanded=not fd.get("confirmed")):

            fc1, fc2 = st.columns(2)

            with fc1:
                st.markdown("**🛬 Arriving at destination**")
                ob_date = st.date_input(
                    "Arrival date",
                    value=fd.get("outbound_date", depart_date),
                    key="fd_ob_date"
                )
                ob_arrive = st.text_input(
                    "Arrival time (local)",
                    value=fd.get("arrival_time", ""),
                    placeholder="e.g. 11:30",
                    key="fd_ob_arrive"
                )

            with fc2:
                st.markdown("**🛫 Departing for home**")
                ret_date = st.date_input(
                    "Departure date",
                    value=fd.get("return_date", return_date),
                    key="fd_ret_date"
                )
                ret_depart = st.text_input(
                    "Departure time (local)",
                    value=fd.get("depart_dest_time", ""),
                    placeholder="e.g. 18:00",
                    key="fd_ret_depart"
                )

            if st.button("✅ Save flight times"):
                st.session_state.flight_details = {
                    "confirmed":             True,
                    "outbound_date":         ob_date,
                    "arrival_time":          ob_arrive,
                    "return_date":           ret_date,
                    "depart_dest_time":      ret_depart,
                    "selected_airport":      _selected_ap,
                    "selected_airport_label": _selected_ap_label,
                }
                # Update itinerary transfer time to match chosen airport
                st.session_state["_dest_airport_info"] = _selected_ap
                st.success(f"Flight times saved — using {_selected_ap.get('iata', 'your airport')} · {_selected_ap.get('transfer_label','') or ''}")
                st.rerun()

        st.markdown("---")

        # ── Car hire section (hidden for public transport only) ──────
        _tmode = profile.get("transport_mode", st.session_state.get("transport_mode",""))
        if "willing to rent" in _tmode:

            # Generate car hire rating + company recommendations if not cached
            if st.session_state.get("car_hire_rating") is None:
                with st.spinner("🚗 Assessing car hire options..."):
                    _fallback_rating = {
                        "rating": 3,
                        "reasons": ["Car hire gives flexibility", "Some attractions are spread out", "Public transport may be limited"],
                        "companies": [
                            {"name": "Hertz",    "rating": "8.5", "highlight": "Wide availability and reliable fleet"},
                            {"name": "Avis",     "rating": "8.2", "highlight": "Competitive prices and good service"},
                            {"name": "Europcar", "rating": "7.9", "highlight": "Local knowledge and flexible options"},
                        ],
                        "avoid": [
                            {"name": "EasyRentCars", "reason": "Frequent hidden fees reported at this location"},
                            {"name": "Goldcar",      "reason": "Aggressive upselling and poor customer service reviews"},
                        ]
                    }
                    try:
                        _trip_type_str = " / ".join(profile.get("trip_type", ["City Break"]))
                        _car_prompt = (
                            f"You are a travel expert. The traveller is visiting {dest} as a {_trip_type_str} trip.\n\n"
                            "Rate how important hiring a car is for this destination and trip type on a scale of 1-5:\n"
                            "1 = Not needed at all (excellent public transport, compact city)\n"
                            "2 = Rarely useful (good transit, car only helps for specific day trips)\n"
                            "3 = Moderately useful (mix of city and rural, car opens some options)\n"
                            "4 = Quite important (spread-out attractions, patchy public transport)\n"
                            "5 = Essential (rural destination, attractions only reachable by car)\n\n"
                            f"Also recommend the top 3 best-reviewed car hire companies at {dest} airport, "
                            "and identify 2 companies with notably poor reviews or complaints at this specific location. "
                            "Use real review scores from Google, TripAdvisor or Trustpilot where known.\n\n"
                            "Return ONLY valid JSON, no markdown:\n"
                            '{"rating": 4, "reasons": ["Short reason 1", "Short reason 2", "Short reason 3"], '
                            '"companies": [{"name": "Hertz", "rating": "8.5/10", "highlight": "Why they are good here"}], '
                            '"avoid": [{"name": "BadCo", "reason": "Why to avoid them here"}]}'
                        )
                        _cr = claude_client.messages.create(
                            model="claude-sonnet-4-6",
                            max_tokens=600,
                            messages=[{"role": "user", "content": _car_prompt}]
                        )
                        import json as _cj, re as _cre
                        _raw   = _cr.content[0].text.strip()
                        _match = _cre.search(r"\{.*\}", _raw, _cre.DOTALL)
                        if _match:
                            st.session_state["car_hire_rating"] = _cj.loads(_match.group())
                        else:
                            st.session_state["car_hire_rating"] = _fallback_rating
                    except Exception:
                        st.session_state["car_hire_rating"] = _fallback_rating

            _cr_data    = st.session_state.get("car_hire_rating") or {}
            _cr_score   = _cr_data.get("rating", 3)
            _cr_reasons = _cr_data.get("reasons", [])

            # ── Usefulness rating card ────────────────────────────
            _rating_labels  = {1: "Not needed", 2: "Rarely useful", 3: "Moderately useful", 4: "Quite important", 5: "Essential"}
            _rating_colours = {1: "#2ecc71", 2: "#8bc34a", 3: "#f1c40f", 4: "#e67e22", 5: "#e74c3c"}
            _stars_filled   = "🚗" * _cr_score
            _stars_empty    = "○" * (5 - _cr_score)
            _rating_label   = _rating_labels.get(_cr_score, "Useful")
            _rating_colour  = _rating_colours.get(_cr_score, "#d4af37")
            _reasons_html   = "".join(
                '<div style="margin:4px 0;font-size:13px;color:#c8bfa8">✓ ' + r + '</div>'
                for r in _cr_reasons
            )
            st.markdown(
                '<div style="background:rgba(15,25,35,0.6);border:1px solid rgba(212,175,55,0.2);'
                'border-radius:10px;padding:16px 20px;margin:12px 0">'
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">'
                '<div style="font-size:22px">' + _stars_filled + '<span style="opacity:0.25">' + _stars_empty + '</span></div>'
                '<div>'
                '<div style="font-weight:700;color:#e8e0d5;font-size:15px">Car hire: '
                '<span style="color:' + _rating_colour + '">' + _rating_label + '</span> for ' + dest_city + '</div>'
                '<div style="font-size:11px;color:#8a9bb0;letter-spacing:0.5px">' + str(_cr_score) + ' / 5</div>'
                '</div></div>' + _reasons_html + '</div>',
                unsafe_allow_html=True
            )

            # ── Yes / No buttons ──────────────────────────────────
            if st.session_state.get("car_hire_confirmed") != "yes" and st.session_state.get("car_hire_confirmed") != "no":
                st.markdown(
                    '<div style="font-size:0.85rem;color:#8a9bb0;margin:4px 0 10px">Will you be hiring a car?</div>',
                    unsafe_allow_html=True
                )
                _yn1, _yn2, _yn3 = st.columns([1, 1, 4])
                with _yn1:
                    if st.button("✅  Yes", key="car_yes", use_container_width=True):
                        st.session_state["car_hire_confirmed"] = "yes"
                        st.rerun()
                with _yn2:
                    if st.button("✖  No", key="car_no", use_container_width=True):
                        st.session_state["car_hire_confirmed"] = "no"
                        st.rerun()

            elif st.session_state.get("car_hire_confirmed") == "no":
                st.markdown(
                    '<div style="font-size:0.85rem;color:#8a9bb0;margin:4px 0 10px">'
                    'Not hiring a car · <span style="cursor:pointer;color:#c9a84c">change</span></div>',
                    unsafe_allow_html=True
                )
                if st.button("↩ Change answer", key="car_change_no"):
                    st.session_state["car_hire_confirmed"] = None
                    st.rerun()

            # Only show the rest if user said Yes
            if st.session_state.get("car_hire_confirmed") == "yes":

                # Build URL bits (needed for both booking card and confirmed banner)
                _fld_car     = st.session_state.flight_details
                _car_ap      = _fld_car.get("selected_airport") or {}
                _car_iata    = _car_ap.get("iata", "")
                _car_ap_name = _car_ap.get("airport_name") or dest_city
                _car_depart  = _fld_car.get("outbound_date") or depart_date
                _car_return  = _fld_car.get("return_date")   or return_date

                def _parse_time(t, default_hour=12):
                    try:
                        t = t.strip()
                        if not t:         return default_hour, 0
                        if ":" in t:      parts = t.split(":"); return int(parts[0]), int(parts[1])
                        elif len(t) <= 2: return int(t), 0
                        elif len(t) == 4: return int(t[:2]), int(t[2:])
                        else:             return int(t), 0
                    except Exception:     return default_hour, 0

                _arr_time    = _fld_car.get("arrival_time", "")
                _dep_time    = _fld_car.get("depart_dest_time", "")
                _pu_hour, _pu_min = _parse_time(_arr_time)
                _do_hour, _do_min = _parse_time(_dep_time)
                _pu_time_str = f"{_pu_hour:02d}:{_pu_min:02d}" if _arr_time else "12:00"
                _do_time_str = f"{_do_hour:02d}:{_do_min:02d}" if _dep_time else "12:00"
                _car_dates   = f"{_car_depart.strftime('%d %b')} → {_car_return.strftime('%d %b')}"
                _times_note  = "· Times pre-filled from your flights" if _arr_time and _dep_time else "· Save your flight times above to pre-fill pickup &amp; dropoff times"

                import urllib.parse as _ul
                if _car_iata:
                    _car_url     = (
                        "https://cars.booking.com/search-results"
                        "?preflang=en&prefcurrency=GBP"
                        f"&locationIata={_car_iata}"
                        f"&puDay={_car_depart.day}&puMonth={_car_depart.month}&puYear={_car_depart.year}"
                        f"&puHour={_pu_hour}&puMinute={_pu_min}"
                        f"&doDay={_car_return.day}&doMonth={_car_return.month}&doYear={_car_return.year}"
                        f"&doHour={_do_hour}&doMinute={_do_min}"
                        "&driversAge=30"
                    )
                    _car_ap_line = f"Pick up at {_car_ap_name} ({_car_iata}) at {_pu_time_str} · Drop off at {_do_time_str}"
                else:
                    _car_url     = (
                        "https://cars.booking.com/search-results"
                        "?preflang=en&prefcurrency=GBP"
                        f"&locationName={_ul.quote_plus(dest_city)}"
                        f"&puDay={_car_depart.day}&puMonth={_car_depart.month}&puYear={_car_depart.year}"
                        f"&puHour={_pu_hour}&puMinute={_pu_min}"
                        f"&doDay={_car_return.day}&doMonth={_car_return.month}&doYear={_car_return.year}"
                        f"&doHour={_do_hour}&doMinute={_do_min}"
                        "&driversAge=30"
                    )
                    _car_ap_line = f"Pick up in {dest_city} at {_pu_time_str} — confirm your airport above first for best results"

                # ── Hire a car card (above top rated) ────────────
                st.markdown(
                    '<div class="flight-link-card"><div>'
                    '<div class="flight-link-title">🚗 Hire a car for your trip</div>'
                    '<div class="flight-link-detail">'
                    + _car_ap_line + ' · ' + _car_dates + ' ' + _times_note +
                    '</div></div>'
                    '<a href="' + _car_url + '" target="_blank" class="flight-link-btn">Search Rentalcars →</a>'
                    '</div>',
                    unsafe_allow_html=True
                )
                st.markdown("")

                # ── Top 3 car hire companies ──────────────────────
                _cr_companies = _cr_data.get("companies", [])
                if _cr_companies:
                    _co_html = ""
                    for _co in _cr_companies[:3]:
                        _co_name      = _co.get("name", "")
                        _co_rating    = str(_co.get("rating", ""))
                        _co_highlight = _co.get("highlight", "")
                        _co_html += (
                            '<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;'
                            'border-bottom:1px solid rgba(255,255,255,0.06)">'
                            '<div style="min-width:90px;font-weight:600;color:#e8e0d5;font-size:13px">' + _co_name + '</div>'
                            '<div style="flex:1;font-size:12px;color:#8a9bb0">' + _co_highlight + '</div>'
                            + ('<div style="min-width:52px;text-align:right;font-size:12px;color:#d4af37;font-weight:600">⭐ ' + _co_rating + '</div>' if _co_rating else '')
                            + '</div>'
                        )
                    st.markdown(
                        '<div style="background:rgba(15,25,35,0.4);border:1px solid rgba(212,175,55,0.15);'
                        'border-radius:10px;padding:14px 18px;margin:8px 0">'
                        '<div style="font-size:11px;font-weight:700;color:#d4af37;letter-spacing:1px;'
                        'text-transform:uppercase;margin-bottom:8px">🏆 Top rated at ' + dest_city + '</div>'
                        + _co_html +
                        '<div style="font-size:11px;color:#8a9bb0;margin-top:10px">'
                        'All available to compare and book via Rentalcars above</div>'
                        '</div>',
                        unsafe_allow_html=True
                    )

                # ── Avoid section ─────────────────────────────────
                _cr_avoid = _cr_data.get("avoid", [])
                if _cr_avoid:
                    _av_html = ""
                    for _av in _cr_avoid[:2]:
                        _av_name   = _av.get("name", "")
                        _av_reason = _av.get("reason", "")
                        _av_html += (
                            '<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;'
                            'border-bottom:1px solid rgba(255,255,255,0.04)">'
                            '<div style="min-width:90px;font-weight:600;color:#e8e0d5;font-size:13px">' + _av_name + '</div>'
                            '<div style="flex:1;font-size:12px;color:#8a9bb0">' + _av_reason + '</div>'
                            '<div style="min-width:32px;text-align:right;font-size:14px">⚠️</div>'
                            '</div>'
                        )
                    st.markdown(
                        '<div style="background:rgba(231,76,60,0.04);border:1px solid rgba(231,76,60,0.2);'
                        'border-radius:10px;padding:14px 18px;margin:8px 0">'
                        '<div style="font-size:11px;font-weight:700;color:#e74c3c;letter-spacing:1px;'
                        'text-transform:uppercase;margin-bottom:8px">⚠️ Worth avoiding at ' + dest_city + '</div>'
                        + _av_html +
                        '</div>',
                        unsafe_allow_html=True
                    )

                st.markdown("")
                if st.button("↩ Change answer", key="car_change_yes"):
                    st.session_state["car_hire_confirmed"] = None
                    st.rerun()

            st.markdown("")

        # ── Hotel Recommendations ───────────────────────────────
        st.markdown("### 🏨 Where to Stay")
        st.markdown(
            "*Three options picked to match your budget and travel style. "
            "Click through to Booking.com to check live availability and prices.*"
        )

        # Get flight dates for the booking link
        fld_h        = st.session_state.flight_details
        h_checkin    = fld_h.get("outbound_date", depart_date)
        h_checkout   = fld_h.get("return_date",   return_date)
        h_checkin_s  = h_checkin.strftime("%Y-%m-%d")  if hasattr(h_checkin,  "strftime") else depart_date.strftime("%Y-%m-%d")
        h_checkout_s = h_checkout.strftime("%Y-%m-%d") if hasattr(h_checkout, "strftime") else return_date.strftime("%Y-%m-%d")
        h_adults     = int(num_adults)
        h_rooms      = 1 if profile.get("group_type") in ["Couple","Solo"] else max(1, h_adults // 2)
        bk_aid       = BOOKING_AFFILIATE_ID or "YOUR_CJ_AID"

        # Build base Booking.com search URL (fallback for each card)
        def booking_search_url(dest_name, checkin, checkout, adults, rooms, aid, keywords=""):
            import urllib.parse
            base = "https://www.booking.com/searchresults.html"
            params = {
                "ss":           keywords or dest_name,
                "checkin":      checkin,
                "checkout":     checkout,
                "group_adults": adults,
                "no_rooms":     rooms,
                "aid":          aid,
                "lang":         "en-gb",
            }
            return base + "?" + urllib.parse.urlencode(params)

        # Generate hotel recommendations (auto-runs, cached in session state)
        if st.session_state.get("hotel_results") is None:
            with st.spinner("Finding the best places to stay..."):
                try:
                    nights   = (h_checkout - h_checkin).days if hasattr(h_checkin, "strftime") else 3
                    budget   = profile.get("budget", "££ — Mid-range")
                    group    = profile.get("group_type", "Couple")
                    pref     = profile.get("priorities", "")
                    trip_t   = " / ".join(profile.get("trip_type", ["City Break"]))

                    hotel_prompt = f"""You are a hotel expert recommending stays in {dest} for a UK traveller.

TRIP DETAILS:
- Destination: {dest}
- Dates: {h_checkin_s} to {h_checkout_s} ({nights} nights)
- Budget tier: {budget} (£=budget hostels/cheap hotels, ££=3-star mid-range, £££=4-5 star luxury)
- Travelling as: {group}
- Trip type: {trip_t}
- Interests: {pref or 'no specific preferences'}

Recommend exactly 3 hotels or accommodation options. Each must be a REAL, named property that exists on Booking.com.
Vary the options — different neighbourhoods, styles or price points within the budget tier.

Return ONLY valid JSON — an array of exactly 3 objects, no other text:
[
  {{
    "name": "Exact hotel name as listed on Booking.com",
    "type": "Hotel / Boutique Hotel / Hostel / Apartment / B&B / Guesthouse",
    "neighbourhood": "Area name e.g. Alfama, City Centre",
    "description": "2 sentences on why this suits this traveller specifically",
    "highlights": ["highlight 1", "highlight 2", "highlight 3"],
    "price_per_night": "approx £X–£X per night",
    "total_price": "approx £X–£X for {nights} nights",
    "badge": "Best Value / Most Central / Most Unique / Best Views / Top Rated",
    "booking_keywords": "search keywords to find this hotel on Booking.com e.g. 'Hotel Avenida Palace Lisbon'"
  }}
]

Rules:
- Only real hotels that actually exist — no invented names
- Price estimates must be realistic for {h_checkin_s} in {dest}
- Match budget tier strictly: £=under £60/night, ££=£60-£150/night, £££=£150+/night
- For groups/families suggest properties with connecting rooms or apartments
- Return only the JSON array"""

                    hotel_resp = claude_client.messages.create(
                        model="claude-sonnet-4-6",
                        max_tokens=1500,
                        messages=[{"role": "user", "content": hotel_prompt}]
                    )
                    import json as _json, re as _re
                    raw_h  = hotel_resp.content[0].text.strip()
                    match_h = _re.search(r"\[.*\]", raw_h, _re.DOTALL)
                    if match_h:
                        hotels = _json.loads(match_h.group())
                        st.session_state.hotel_results = hotels[:3]
                    else:
                        st.session_state.hotel_results = []
                except Exception as e:
                    st.session_state.hotel_results = []
                    st.warning(f"Could not load hotel suggestions: {e}")

        hotels = st.session_state.get("hotel_results") or []

        if hotels:
            for hotel in hotels:
                h_name      = hotel.get("name", "")
                h_type      = hotel.get("type", "Hotel")
                h_area      = hotel.get("neighbourhood", "")
                h_desc      = hotel.get("description", "")
                h_highlights = hotel.get("highlights", [])
                h_ppn       = hotel.get("price_per_night", "")
                h_total     = hotel.get("total_price", "")
                h_badge     = hotel.get("badge", "")
                h_keywords  = hotel.get("booking_keywords", h_name)

                h_url = booking_search_url(dest_city, h_checkin_s, h_checkout_s,
                                           h_adults, h_rooms, bk_aid, h_keywords)

                highlights_html = "".join(
                    f'<span class="hotel-fact">✓ {h}</span>' for h in h_highlights
                )
                badge_html = f'<div class="hotel-badge">{h_badge}</div>' if h_badge else ""

                st.markdown(f"""
<div class="hotel-card">
    {badge_html}
    <div class="hotel-name">{h_name}</div>
    <div class="hotel-type">{h_type} · {h_area}</div>
    <div class="hotel-desc">{h_desc}</div>
    <div class="hotel-facts">{highlights_html}</div>
    <div class="hotel-price">{h_ppn} &nbsp;·&nbsp; {h_total} total</div>
    <a href="{h_url}" target="_blank" class="hotel-book-btn">Check availability on Booking.com →</a>
</div>
""", unsafe_allow_html=True)

            if st.button("🔄 Refresh hotel suggestions", key="refresh_hotels"):
                st.session_state.hotel_results = None
                st.rerun()

            st.caption(
                "💡 Prices are estimates — click through for live rates. "
                + (f"Booking made via Sherpa supports the app." if BOOKING_AFFILIATE_ID else
                   "Add your `BOOKING_AFFILIATE_ID` to `.env` to earn affiliate commission.")
            )
        else:
            dest_encoded = dest_city.replace(" ", "+")
            fallback_url = booking_search_url(dest_city, h_checkin_s, h_checkout_s,
                                              h_adults, h_rooms, bk_aid)
            st.markdown(
                f"[🏨 Search all hotels in {dest_city} on Booking.com]({fallback_url})"
            )

        # ── Accommodation selector ─────────────────────────────
        st.markdown("#### 🏨 Confirm your accommodation")
        _hotel_names = [h.get("name","") for h in (st.session_state.get("hotel_results") or []) if h.get("name")]

        if not _hotel_names:
            # Hotels haven't loaded yet — just show the free-text input
            _saved_hotel = st.session_state.get("selected_hotel") or ""
            _custom_hotel = st.text_input(
                "Where are you staying?",
                value=_saved_hotel,
                placeholder="e.g. Hotel Avenida Palace, Airbnb in Alfama…",
                key="accom_custom_only"
            )
            if _custom_hotel.strip():
                st.session_state.selected_hotel = _custom_hotel.strip()
        else:
            _accom_options = _hotel_names + ["Somewhere else — I'll type it in"]
            _saved_hotel   = st.session_state.get("selected_hotel") or ""

            if _saved_hotel in _hotel_names:
                _accom_default = _accom_options.index(_saved_hotel)
            else:
                _accom_default = 0

            _accom_choice = st.selectbox(
                "Where are you staying?",
                _accom_options,
                index=_accom_default,
                key="accom_select",
                help="Select one of the suggestions above, or the last option to type your own"
            )

            if _accom_choice == "Somewhere else — I'll type it in":
                _custom_hotel = st.text_input(
                    "Accommodation name",
                    value=_saved_hotel if _saved_hotel not in _hotel_names else "",
                    placeholder="e.g. Airbnb in Alfama, Hotel Nacional, etc.",
                    key="accom_custom"
                )
                _final_hotel = _custom_hotel.strip()
            else:
                _final_hotel = _accom_choice

            if _final_hotel and _final_hotel != st.session_state.get("selected_hotel"):
                st.session_state.selected_hotel = _final_hotel

        if st.session_state.get("selected_hotel"):
            st.success(f"✅ Staying at: **{st.session_state.selected_hotel}**")

        st.markdown("---")

        # ── AI Itinerary ───────────────────────────────────────
        st.markdown("### 🗓️ Build Your Full Itinerary")

        # Resolve transfer label — dest_airport_info defined above in flight section
        _airport_info      = st.session_state.get("_dest_airport_info", {})
        transfer_label_prompt = _airport_info.get("transfer_label") or "approx 30–45 min"

        if st.button("🗓️ Build My Full Plan"):
            with st.spinner(f"Building your {dest} itinerary..."):
                try:
                    trip_type_text  = " / ".join(profile.get("trip_type",["City Break"]))
                    priorities_text = profile.get("priorities","no specific preferences")

                    # Build flight timing context for the prompt
                    fld = st.session_state.flight_details
                    _ap_info      = st.session_state.get("_dest_airport_info", {})
                    _origin_city  = origin_city or "UK"
                    _dest_ap_name = (
                        fld.get("selected_airport", {}).get("airport_name")
                        or _ap_info.get("airport_name")
                        or dest_city + " Airport"
                    )
                    _dest_ap_iata = (
                        fld.get("selected_airport", {}).get("iata")
                        or _ap_info.get("iata")
                        or ""
                    )
                    _ap_label = f"{_dest_ap_name} ({_dest_ap_iata})" if _dest_ap_iata else _dest_ap_name

                    if fld.get("confirmed"):
                        ob_date_str    = fld["outbound_date"].strftime("%A %d %B") if fld.get("outbound_date") else "Friday"
                        ret_date_str   = fld["return_date"].strftime("%A %d %B")   if fld.get("return_date")  else "Monday"
                        arrival_time   = fld.get("arrival_time", "?")
                        departure_time = fld.get("depart_dest_time", "?")
                        flight_context = f"""
CONFIRMED TRAVEL DETAILS — you MUST build the entire itinerary around these exactly:
- Mode of travel: FLIGHT (not train, not Eurostar, not coach — this is an air journey)
- Flying from: {_origin_city}
- Arriving at: {_ap_label}
- Arrival time at airport: {arrival_time} on {ob_date_str}
- Departing from: {_ap_label}
- Departure time from airport: {departure_time} on {ret_date_str}
- Airport transfer: {transfer_label_prompt} from {_ap_label} to {dest_city} city centre

TIMING RULES:
- Arrival day: first activity cannot start until at least 1.5 hrs after {arrival_time} (baggage collection + {transfer_label_prompt} transfer from {_ap_label}). Describe this transfer explicitly in the Getting There section — name the airport and transfer method.
- Departure day: work backwards from {departure_time} — allow {transfer_label_prompt} to get back to {_ap_label} PLUS 2 hrs check-in. Name the airport in the Getting Home section.
- If arrival is after 18:00, arrival day is travel/settle only — skip Morning/Afternoon/Lunch
- If departure is before 12:00, departure day is airport only — skip all activity sections"""
                    else:
                        flight_context = f"""
TRAVEL DETAILS: Flight times not yet confirmed.
- Mode of travel: FLIGHT from {_origin_city} to {_ap_label}
- Airport transfer: {transfer_label_prompt} from airport to {dest_city} city centre
- Assume arrival around 14:00 on the first day, departure around 18:00 on the last day.
- Always name {_ap_label} as the arrival/departure airport — never suggest Eurostar or any other transport mode."""

                    # Resolve transport mode into plain variable for prompt
                    _t_mode = profile.get("transport_mode", st.session_state.get("transport_mode", "🚇 Public transport only"))
                    if "willing to rent" in _t_mode:
                        _transport_rule = "- The traveller is open to renting a car if it makes sense for this destination. Use your judgement — suggest car hire for destinations where it genuinely unlocks better experiences (rural areas, spread-out attractions, coastal drives). For city-based trips where public transport is excellent, lean towards that instead and only mention car hire as an option for specific day trips."
                    else:
                        _transport_rule = "- The traveller is using PUBLIC TRANSPORT ONLY — no hire car. Every suggested journey must use trains, buses, metro or taxis. Do not suggest driving. Include specific line names, journey times and approximate costs for every transfer mentioned."

                    # Resolve hotel context
                    _hotel_name = st.session_state.get("selected_hotel") or ""
                    if _hotel_name:
                        _hotel_context = f"The traveller is staying at {_hotel_name}. Use this as a geographic anchor — reference the neighbourhood it is in for morning walks, nearby breakfast spots, and walking distances to attractions. Do not describe the hotel itself."
                    else:
                        _hotel_context = "Accommodation not yet confirmed — do not reference any specific hotel or neighbourhood."

                    # Build day-by-day itinerary sections from actual dates
                    fld_dates = st.session_state.flight_details
                    actual_depart = fld_dates.get("outbound_date", depart_date)
                    actual_return = fld_dates.get("return_date", return_date)

                    # Generate every day between arrival and departure inclusive
                    from datetime import timedelta as _td
                    all_days = []
                    _d = actual_depart
                    while _d <= actual_return:
                        all_days.append(_d)
                        _d += _td(days=1)

                    # Build the day sections dynamically
                    day_sections = ""
                    for idx, day in enumerate(all_days):
                        day_label = day.strftime("%A %d %B")
                        if idx == 0:
                            day_sections += f"""
### {day_label} — Arrival Day
**✈️ Getting There:** [Airport transfer method suited to their transport mode — if hire car: mention pickup location at airport and drive time; if public transport: specific line, duration and cost]

**🌅 Afternoon:** [First activity after settling in — something low-key and close by. Only include if arriving before 16:00.]

**🍽️ Dinner:** [One specific restaurant recommendation with cuisine type and rough cost for two]

**🌙 Evening:** [Optional — a bar, walk or area to explore. Skip if late arrival.]
"""
                        elif idx == len(all_days) - 1:
                            day_sections += f"""
### {day_label} — Departure Day
**☀️ Morning:** [Final activity or breakfast spot if time allows — only if departure is after 13:00]

**🥗 Lunch:** [Quick bite before heading to the airport — only if time allows]

**🚌 Getting Home:** [Transfer back to airport matching their transport mode — if hire car: car return location, drop-off time needed; if public transport: specific line/bus, departure point, duration, cost. Work backwards from {departure_time}.]
"""
                        else:
                            day_sections += f"""
### {day_label}
**☀️ Morning:** [One or two activities — specific venues, what to see or do, practical tip]

**🥗 Lunch:** [A specific cafe, market stall or restaurant — what to order, rough cost]

**🏛️ Afternoon:** [One or two activities — mix it up from the morning, include any entry costs]

**🍷 Dinner:** [Specific restaurant — neighbourhood, cuisine, dish recommendation, rough cost for two]

**🌙 Evening:** [Bar, live music, night walk or early night — keep it optional and relaxed]
"""

                    prompt = f"""
You are Sherpa, an expert travel planner. Create a detailed trip plan for {dest}.

TRAVELLER PROFILE:
- Departing from: {origin_city or 'UK'}
- Travel dates: {
    (st.session_state.get("travel_dates",{}).get("specific_depart").strftime("%d %B") + " – " +
     st.session_state.get("travel_dates",{}).get("specific_return").strftime("%d %B %Y"))
    if st.session_state.get("travel_dates",{}).get("mode") == "specific"
    else travel_month
}
- Trip dates: {actual_depart.strftime('%A %d %B')} to {actual_return.strftime('%A %d %B %Y')} ({len(all_days)} days)
- Budget tier: {profile.get('budget','££ — Mid-range')}
  (£ = budget, ££ = mid-range, £££ = luxury — calibrate all venue and activity recommendations accordingly)
- Travelling as: {profile.get('group_type','Couple')}
- Trip type: {trip_type_text}
- What they love: {priorities_text}
- Getting around: {_t_mode}
- Staying at: {_hotel_name or "not yet selected"}
{flight_context}

TRANSPORT RULES — follow strictly:
{_transport_rule}

HOTEL CONTEXT:
{_hotel_context}

FORMATTING RULES — follow exactly:
- Use plain text for costs e.g. "approx €15 pp" — never use ~~strikethrough~~
- Keep each section to 2-4 sentences max — concise, scannable, useful
- Write in second person ("Head to...", "Try the...", "Walk along...")
- Include one specific venue name per section minimum
- Do NOT describe the hotel or mention check-in
- Do NOT number the sections or add bullet points within sections

## 🗓️ Your Itinerary
{day_sections}
## 💰 Cost Guide
- Flights: £X–£X return pp
- Food & drink: approx £X–£X per day
- Activities: £X–£X total
- Local transport: £X–£X
- **Estimated total (exc. accommodation): £X–£X per person**

## 📌 Local Tips
[3 short, specific tips that most travel guides miss — practical and personal]
"""
                    message = claude_client.messages.create(
                        model="claude-sonnet-4-6",
                        max_tokens=4000,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    st.session_state.book_results = message.content[0].text

                except Exception as e:
                    st.error(f"Something went wrong: {e}")

        if st.session_state.book_results:
            raw_itin = st.session_state.book_results

            # ── Parse and render itinerary as styled cards ──────
            import re as _re

            # Split into sections by ## headings
            _sections = _re.split(r"(?=^## )", raw_itin, flags=_re.MULTILINE)

            # Section label emoji map
            _section_emojis = {
                "morning":    ("☀️", "Morning"),
                "lunch":      ("🥗", "Lunch"),
                "afternoon":  ("🏛️", "Afternoon"),
                "dinner":     ("🍷", "Dinner"),
                "evening":    ("🌙", "Evening"),
                "getting there": ("✈️", "Getting There"),
                "getting home":  ("🚌", "Getting Home"),
            }

            for _sec in _sections:
                _sec = _sec.strip()
                if not _sec:
                    continue

                _lines = _sec.split("\n")
                _heading = _lines[0].lstrip("#").strip()
                _body    = "\n".join(_lines[1:]).strip()

                # ── Day itinerary cards ──────────────────────────
                if _heading.startswith("🗓️") or "Itinerary" in _heading:
                    st.markdown(f"### {_heading}")
                    # Split body into individual day blocks (### Day headings)
                    _day_blocks = _re.split(r"(?=^### )", _body, flags=_re.MULTILINE)
                    for _block in _day_blocks:
                        _block = _block.strip()
                        if not _block:
                            continue
                        _dlines   = _block.split("\n")
                        _day_head = _dlines[0].lstrip("#").strip()
                        _day_body = "\n".join(_dlines[1:]).strip()

                        # Parse bold **label:** sections within each day
                        _parts = _re.split(r"(\*\*[^*]+:\*\*)", _day_body)
                        _sections_html = ""
                        _current_label = None
                        _current_text  = []

                        for _part in _parts:
                            _label_match = _re.match(r"\*\*(.+?):\*\*", _part)
                            if _label_match:
                                # Save previous
                                if _current_label and _current_text:
                                    _txt = " ".join(_current_text).strip()
                                    _txt = _re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", _txt)
                                    _sections_html += (
                                        f'<div class="day-section">' +
                                        f'<div class="day-section-label">{_current_label}</div>' +
                                        f'<div class="day-section-text">{_txt}</div>' +
                                        f'</div>'
                                    )
                                # Start new
                                _raw_label = _label_match.group(1).strip()
                                # Strip emoji from label for lookup
                                _clean_label = _re.sub(r"[^\w\s]", "", _raw_label).strip().lower()
                                _emoji_info  = next(
                                    (v for k, v in _section_emojis.items() if k in _clean_label),
                                    None
                                )
                                _current_label = f"{_emoji_info[0]} {_emoji_info[1]}" if _emoji_info else _raw_label
                                _current_text  = []
                            else:
                                _current_text.append(_part.strip())

                        # Flush last section
                        if _current_label and _current_text:
                            _txt = " ".join(_current_text).strip()
                            _txt = _re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", _txt)
                            _sections_html += (
                                f'<div class="day-section">' +
                                f'<div class="day-section-label">{_current_label}</div>' +
                                f'<div class="day-section-text">{_txt}</div>' +
                                f'</div>'
                            )

                        if not _sections_html:
                            _sections_html = f'<div class="day-section-text">{_day_body}</div>'

                        st.markdown(
                            f'<div class="day-card">' +
                            f'<div class="day-header">🗓️ {_day_head}</div>' +
                            _sections_html +
                            f'</div>',
                            unsafe_allow_html=True
                        )

                # ── Cost guide ───────────────────────────────────
                elif "Cost" in _heading or "cost" in _heading.lower():
                    _cost_lines = [l.strip() for l in _body.split("\n") if l.strip().startswith("-")]
                    _rows_html = ""
                    for _cl in _cost_lines:
                        _cl = _cl.lstrip("- ").strip()
                        _bold = _re.match(r"\*\*(.+?)\*\*", _cl)
                        if _bold:
                            _rows_html += f'<div class="cost-row cost-total"><span>{_bold.group(1)}</span></div>'
                        else:
                            _parts2 = _cl.split(":", 1)
                            if len(_parts2) == 2:
                                _rows_html += f'<div class="cost-row"><span>{_parts2[0].strip()}</span><span>{_parts2[1].strip()}</span></div>'
                            else:
                                _rows_html += f'<div class="cost-row"><span>{_cl}</span></div>'
                    if _rows_html:
                        st.markdown(
                            f'<div class="itinerary-meta"><h4>💰 Cost Guide</h4>{_rows_html}</div>',
                            unsafe_allow_html=True
                        )
                    else:
                        st.markdown(f"### 💰 Cost Guide\n\n{_body}")

                # ── Local tips ───────────────────────────────────
                elif "Tip" in _heading or "Local" in _heading:
                    st.markdown(f"### {_heading}")
                    _tip_lines = [l.strip() for l in _body.split("\n") if l.strip()]
                    _tips_html = "".join(
                        f'<div class="tip-item">💡 {_tl.lstrip("-• ").strip()}</div>'
                        for _tl in _tip_lines if _tl
                    )
                    st.markdown(
                        f'<div class="itinerary-meta">{_tips_html}</div>',
                        unsafe_allow_html=True
                    )

                # ── Everything else — plain markdown ─────────────
                else:
                    st.markdown(_sec)


            # ── Interactive Map + Google Maps Export ─────────────
            st.markdown("---")
            st.markdown("### 🗺️ Your Trip on the Map")

            if st.session_state.get("map_locations") is None:
                with st.spinner("📍 Pinning your locations on the map..."):
                    try:
                        import json as _mj, re as _mre
                        _ep = (
                            f"Extract every specific named location from this travel itinerary for {dest}.\n"
                            "Include: restaurants, cafes, bars, attractions, museums, markets, parks, viewpoints.\n"
                            "Exclude: airports, accommodation, and generic transport references.\n\n"
                            f"ITINERARY:\n{st.session_state.book_results}\n\n"
                            "Return ONLY a valid JSON array, no markdown, no explanation:\n"
                            '[{"name":"Venue name","type":"Restaurant","lat":38.72,"lng":-9.13,"address":"Full address, City, Country","notes":"Why visit"}]\n'
                            "type must be one of: Restaurant, Cafe, Bar, Attraction, Museum, Market, Park, Viewpoint\n"
                            f"lat/lng must be accurate real-world coordinates for the place in {dest}.\n"
                            "address must be a full address including street, city and country — this is used for Google Maps import.\n"
                            "Return only the JSON array."
                        )
                        _mr2 = claude_client.messages.create(
                            model="claude-sonnet-4-6",
                            max_tokens=2000,
                            messages=[{"role": "user", "content": _ep}]
                        )
                        _raw   = _mr2.content[0].text.strip()
                        _match = _mre.search(r"\[.*\]", _raw, _mre.DOTALL)
                        if _match:
                            st.session_state.map_locations = _mj.loads(_match.group())
                        else:
                            st.session_state.map_locations = []
                    except Exception as _me:
                        st.session_state.map_locations = []
                        st.warning(f"Could not extract map locations: {_me}")

            locations = st.session_state.get("map_locations") or []

            if locations:
                type_colours = {
                    "Restaurant": "#e74c3c", "Cafe": "#e67e22", "Bar": "#9b59b6",
                    "Attraction": "#2ecc71", "Museum": "#3498db", "Market": "#f1c40f",
                    "Park":       "#27ae60", "Viewpoint": "#1abc9c",
                }
                type_icons = {
                    "Restaurant": "🍽️", "Cafe": "☕", "Bar": "🍸",
                    "Attraction": "🎭", "Museum": "🏛️", "Market": "🛍️",
                    "Park":       "🌳", "Viewpoint": "📸",
                }

                avg_lat = sum(l["lat"] for l in locations) / len(locations)
                avg_lng = sum(l["lng"] for l in locations) / len(locations)

                # ── Leaflet map with Google Maps popup links ────────
                import urllib.parse as _uparse
                markers_js = ""
                for idx, loc in enumerate(locations):
                    colour   = type_colours.get(loc.get("type", "Attraction"), "#c9a84c")
                    name_e   = loc["name"].replace("'", "&#39;").replace('"', "&quot;")
                    notes_e  = loc.get("notes", "").replace("'", "&#39;").replace('"', "&quot;")
                    type_e   = loc.get("type", "").replace("'", "&#39;")
                    num      = idx + 1
                    # Google Maps search URL for this specific venue
                    gm_query = _uparse.quote(f"{loc['name']}, {dest_city}")
                    gm_url   = f"https://www.google.com/maps/search/?api=1&query={gm_query}"
                    _popup = (
                        f"<div style='font-family:sans-serif;min-width:180px;padding:2px'>"
                        f"<div style='font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:2px'>"
                        f"<span style='background:{colour};color:#fff;border-radius:50%;width:18px;height:18px;"
                        f"display:inline-flex;align-items:center;justify-content:center;font-size:10px;"
                        f"font-weight:700;margin-right:6px'>{num}</span>{name_e}</div>"
                        f"<div style='font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;"
                        f"margin-bottom:4px'>{type_e}</div>"
                        f"<div style='font-size:11px;color:#555;margin-bottom:8px'>{notes_e}</div>"
                        f"<a href='{gm_url}' target='_blank' style='display:inline-block;background:#4285F4;"
                        f"color:#fff;padding:5px 10px;border-radius:4px;font-size:11px;font-weight:600;"
                        f"text-decoration:none;letter-spacing:0.5px'>📍 Open in Google Maps ↗</a>"
                        f"</div>"
                    )
                    # Numbered div icon — build without nested f-strings to avoid brace issues
                    _div_style = (
                        "width:26px;height:26px;border-radius:50%;"
                        f"background:{colour};border:2.5px solid #fff;"
                        "display:flex;align-items:center;justify-content:center;"
                        "font-size:11px;font-weight:700;color:#fff;"
                        "box-shadow:0 2px 6px rgba(0,0,0,0.4)"
                    )
                    _div_html = f'<div style=\\"{_div_style}\\">{num}</div>'
                    icon_js = (
                        "L.divIcon({className:'',html:'" + _div_html + "',"
                        "iconSize:[26,26],iconAnchor:[13,13],popupAnchor:[0,-13]})"
                    )
                    markers_js += (
                        f"L.marker([{loc['lat']},{loc['lng']}],"
                        "{icon:" + icon_js + "})"
                        f".addTo(map).bindPopup({repr(_popup)},{{maxWidth:260}});\n"
                    )

                seen_types  = list(dict.fromkeys(l.get("type", "") for l in locations if l.get("type")))
                legend_html = "".join(
                    '<div style="display:flex;align-items:center;gap:6px;margin:3px 0">'
                    f'<div style="width:10px;height:10px;border-radius:50%;background:{type_colours.get(t,"#c9a84c")}"></div>'
                    f'<span>{type_icons.get(t,"📍")} {t}</span></div>'
                    for t in seen_types
                )

                map_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  html,body{{margin:0;padding:0;background:#0c1118;height:100%}}
  #map{{width:100%;height:440px}}
  .legend{{position:absolute;bottom:16px;left:10px;z-index:1000;
    background:rgba(12,17,24,0.93);border:1px solid rgba(201,168,76,0.3);
    border-radius:8px;padding:10px 14px;font-size:12px;color:#e8e2d9;font-family:sans-serif;pointer-events:none}}
  .legend-title{{font-weight:600;color:#c9a84c;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px}}
  .leaflet-popup-content-wrapper{{border-radius:8px!important;box-shadow:0 4px 20px rgba(0,0,0,0.25)!important}}
</style>
</head><body>
<div id="map"></div>
<div class="legend"><div class="legend-title">Tap a pin to open in Google Maps</div>{legend_html}</div>
<script>
var map = L.map('map',{{zoomControl:true,scrollWheelZoom:true}}).setView([{avg_lat},{avg_lng}],14);
L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png',{{
  attribution:'© OpenStreetMap © CARTO',subdomains:'abcd',maxZoom:19
}}).addTo(map);
{markers_js}
</script></body></html>"""

                st.components.v1.html(map_html, height=460)
                st.markdown("")

                # ── Map export buttons ─────────────────────────────
                import io as _io

                # Build KML — each location becomes an individual pin in Google Maps
                _type_colours_kml = {
                    "Restaurant": "ff2222e7", "Cafe": "ff22a0e6", "Bar": "ffb35a9b",
                    "Attraction": "ff71cc2e", "Museum": "ffdb9834", "Market": "ff00d7f1",
                    "Park":       "ff27ae60", "Viewpoint": "ff1abc9c",
                }
                _kml_placemarks = ""
                for _kl in locations:
                    _kn   = _kl.get("name","").replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
                    _kt   = _kl.get("type","")
                    _knot = _kl.get("notes","").replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
                    _kml_placemarks += f"""  <Placemark>
    <name>{_kn}</name>
    <description>{_kt} — {_knot}</description>
    <Point><coordinates>{_kl.get("lng",0)},{_kl.get("lat",0)},0</coordinates></Point>
  </Placemark>
"""
                _kml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Sherpa — {dest_city}</name>
    <description>Your Sherpa trip locations for {dest_city}</description>
{_kml_placemarks}  </Document>
</kml>"""

                # CSV for My Maps desktop import
                import csv as _csv
                _csv_buf = _io.StringIO()
                _writer  = _csv.writer(_csv_buf)
                _writer.writerow(["Name", "Type", "Address", "Notes", "Latitude", "Longitude"])
                for loc in locations:
                    _writer.writerow([
                        loc.get("name", ""),
                        loc.get("type", ""),
                        loc.get("address", dest_city),
                        loc.get("notes", ""),
                        loc.get("lat", ""),
                        loc.get("lng", ""),
                    ])
                _csv_data = _csv_buf.getvalue()

                _gc1, _gc2 = st.columns(2)
                with _gc1:
                    st.download_button(
                        label="📱 Download for Google Maps (mobile)",
                        data=_kml_content,
                        file_name=f"sherpa_{dest_city.lower().replace(' ','_')}_locations.kml",
                        mime="application/vnd.google-earth.kml+xml",
                        help="Open this KML file on your phone — each venue becomes its own individual pin in Google Maps",
                        use_container_width=True,
                    )
                with _gc2:
                    st.download_button(
                        label="🖥️ Download CSV for Google My Maps",
                        data=_csv_data,
                        file_name=f"sherpa_{dest_city.lower().replace(' ','_')}_locations.csv",
                        mime="text/csv",
                        help="Import into mymaps.google.com on desktop to build a custom saved map",
                        use_container_width=True,
                    )

                with st.expander("📖 How to open pins in Google Maps on your phone"):
                    st.markdown("""
**Quickest — KML file on mobile:**
1. Download the **KML file** above on your phone
2. Tap the downloaded file — Google Maps opens automatically
3. Every venue appears as its own individual pin ✅
4. Tap any pin to see the name and notes
5. Works on both iPhone and Android

**Alternative — Google My Maps (desktop + mobile):**
1. Download the **CSV file** above
2. Go to **[mymaps.google.com](https://mymaps.google.com)** → **Create a new map**
3. Click **Import** → upload the CSV → choose **Latitude/Longitude** as location, **Name** as title
4. Your map syncs automatically to the Google Maps app on your phone
""")

                # ── Location list with individual Google Maps links ──
                st.markdown("")
                st.markdown(
                    '<div style="font-size:0.7rem;color:#5f7080;letter-spacing:2px;'
                    'text-transform:uppercase;margin-bottom:0.8rem">All locations</div>',
                    unsafe_allow_html=True
                )
                cols_by_type = {}
                for loc in locations:
                    cols_by_type.setdefault(loc.get("type", "Other"), []).append(loc)
                col_groups = list(cols_by_type.items())
                for i in range(0, len(col_groups), 2):
                    c1, c2 = st.columns(2)
                    for col, (typ, places) in zip([c1, c2], col_groups[i:i+2]):
                        with col:
                            icon = type_icons.get(typ, "📍")
                            st.markdown(f"**{icon} {typ}s**")
                            for p in places:
                                _pq  = _uparse.quote(f"{p['name']}, {dest_city}")
                                _pu  = f"https://www.google.com/maps/search/?api=1&query={_pq}"
                                st.markdown(
                                    f'&nbsp;&nbsp;**<a href="{_pu}" target="_blank" '
                                    f'style="color:inherit;text-decoration:none">'
                                    f'{p["name"]} ↗</a>**'
                                    f' <span style="color:#8a9bb0;font-size:0.79rem">— {p.get("notes","")}</span>',
                                    unsafe_allow_html=True
                                )
                            st.markdown("")

            _rc1, _rc2 = st.columns([1, 4])
            with _rc1:
                if st.button("🔄 Refresh map"):
                    st.session_state.map_locations = None
                    st.rerun()

# ── Support Tab ─────────────────────────────────────────────────
elif st.session_state.active_tab == "Support":

    st.markdown("## 🧭 Trip Summary & Support")
    st.markdown(
        "*Everything from your booking in one place — copy details, "
        "ask questions, or get help with any part of your trip.*"
    )

    _s_dest     = st.session_state.get("chosen_destination") or ""
    _s_profile  = st.session_state.get("user_profile") or {}
    _s_flights  = st.session_state.get("flight_details") or {}
    _s_hotels   = st.session_state.get("hotel_results") or []
    _s_hotel    = st.session_state.get("selected_hotel") or ""
    _s_car      = st.session_state.get("car_hire_confirmed")
    _s_car_data = st.session_state.get("car_hire_rating") or {}
    _s_dates    = st.session_state.get("travel_dates") or {}
    _s_itin     = st.session_state.get("book_results") or ""

    if not _s_dest:
        st.info("👋 Head to the **Book** tab first to plan your trip — your details will appear here automatically.")
    else:
        _s_depart   = _s_flights.get("outbound_date") or _s_dates.get("specific_depart")
        _s_return   = _s_flights.get("return_date")   or _s_dates.get("specific_return")
        _s_ap       = _s_flights.get("selected_airport") or {}
        _s_iata     = _s_ap.get("iata", "")
        _s_ap_name  = _s_ap.get("airport_name", "")
        _s_arr_t    = _s_flights.get("arrival_time", "")
        _s_dep_t    = _s_flights.get("depart_dest_time", "")
        _s_nights   = ((_s_return - _s_depart).days if _s_depart and _s_return and hasattr(_s_depart, "strftime") else None)
        _s_date_str = (
            f"{_s_depart.strftime('%a %d %b')} to {_s_return.strftime('%a %d %b %Y')}"
            if _s_depart and hasattr(_s_depart, "strftime") else
            _s_dates.get("month", "Dates not set")
        )
        _trip_types = _s_profile.get("trip_type", [])

        # Trip header
        st.markdown(
            f'<div style="background:linear-gradient(135deg,rgba(201,168,76,0.12),rgba(15,25,35,0.8));' +
            f'border:1px solid rgba(201,168,76,0.35);border-radius:14px;padding:22px 26px;margin-bottom:20px">' +
            f'<div style="font-size:1.6rem;font-weight:700;color:#e8e0d5;margin-bottom:4px">{_s_dest}</div>' +
            f'<div style="font-size:0.95rem;color:#c9a84c;margin-bottom:12px">{_s_date_str}' +
            (f' &nbsp;·&nbsp; {_s_nights} nights' if _s_nights else '') +
            f'</div>' +
            f'<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:0.82rem;color:#8a9bb0">' +
            (f'<span>✈️ {_s_ap_name} ({_s_iata})</span>' if _s_iata else '') +
            (f'<span>🛬 Arrive {_s_arr_t}</span>' if _s_arr_t else '') +
            (f'<span>🛫 Depart {_s_dep_t}</span>' if _s_dep_t else '') +
            (f'<span>👥 {_s_profile.get("group_type","")}</span>' if _s_profile.get("group_type") else '') +
            (f'<span>💰 {_s_profile.get("budget","")}</span>' if _s_profile.get("budget") else '') +
            f'</div></div>',
            unsafe_allow_html=True
        )

        # Summary cards row 1
        _sc1, _sc2 = st.columns(2)
        with _sc1:
            _fl_confirmed = _s_flights.get("confirmed", False)
            _fl_colour    = "#4caf7d" if _fl_confirmed else "#8a9bb0"
            _fl_status    = "Saved" if _fl_confirmed else "Not saved yet"
            _fl_lines = []
            if _s_arr_t:   _fl_lines.append(f"Arrive: {_s_arr_t}")
            if _s_dep_t:   _fl_lines.append(f"Depart: {_s_dep_t}")
            if _s_iata:    _fl_lines.append(f"{_s_ap_name} ({_s_iata})")
            _fl_detail = " · ".join(_fl_lines) if _fl_lines else "Go to Book tab and save your flight times"
            st.markdown(
                '<div style="background:rgba(15,25,35,0.5);border:1px solid rgba(255,255,255,0.08);' +
                'border-radius:10px;padding:16px;margin-bottom:12px">' +
                '<div style="font-size:10px;font-weight:700;color:#c9a84c;letter-spacing:1.5px;' +
                'text-transform:uppercase;margin-bottom:8px">✈️ Flights</div>' +
                f'<div style="font-size:12px;color:{_fl_colour};font-weight:600;margin-bottom:6px">{"✅" if _fl_confirmed else "⏳"} {_fl_status}</div>' +
                f'<div style="font-size:12px;color:#8a9bb0">{_fl_detail}</div>' +
                '</div>',
                unsafe_allow_html=True
            )
        with _sc2:
            _h_colour = "#4caf7d" if _s_hotel else "#8a9bb0"
            _h_names  = [h.get("name","") for h in _s_hotels if h.get("name")]
            _h_detail = ("Options: " + ", ".join(_h_names[:3])) if _h_names and not _s_hotel else ("" if _s_hotel else "Go to Book tab to see hotel options")
            st.markdown(
                '<div style="background:rgba(15,25,35,0.5);border:1px solid rgba(255,255,255,0.08);' +
                'border-radius:10px;padding:16px;margin-bottom:12px">' +
                '<div style="font-size:10px;font-weight:700;color:#c9a84c;letter-spacing:1.5px;' +
                'text-transform:uppercase;margin-bottom:8px">🏨 Hotel</div>' +
                f'<div style="font-size:12px;color:{_h_colour};font-weight:600;margin-bottom:6px">{"✅ " + _s_hotel if _s_hotel else "⏳ Not selected yet"}</div>' +
                f'<div style="font-size:12px;color:#8a9bb0">{_h_detail}</div>' +
                '</div>',
                unsafe_allow_html=True
            )

        # Summary cards row 2
        _sc3, _sc4 = st.columns(2)
        with _sc3:
            _car_labels = {"yes": "✅ Hiring a car", "no": "✖️ No car hire", None: "⏳ Not answered yet"}
            _car_colour = {"yes": "#4caf7d", "no": "#8a9bb0", None: "#8a9bb0"}
            _car_top    = ", ".join(c.get("name","") for c in _s_car_data.get("companies",[])[:3])
            st.markdown(
                '<div style="background:rgba(15,25,35,0.5);border:1px solid rgba(255,255,255,0.08);' +
                'border-radius:10px;padding:16px;margin-bottom:12px">' +
                '<div style="font-size:10px;font-weight:700;color:#c9a84c;letter-spacing:1.5px;' +
                'text-transform:uppercase;margin-bottom:8px">🚗 Car Hire</div>' +
                f'<div style="font-size:12px;color:{_car_colour.get(_s_car,"#8a9bb0")};font-weight:600;margin-bottom:6px">{_car_labels.get(_s_car,"⏳ Not answered yet")}</div>' +
                (f'<div style="font-size:12px;color:#8a9bb0">Top picks: {_car_top}</div>' if _car_top and _s_car == "yes" else '') +
                '</div>',
                unsafe_allow_html=True
            )
        with _sc4:
            _transport = st.session_state.get("transport_mode","")
            _priorities = _s_profile.get("priorities","")
            st.markdown(
                '<div style="background:rgba(15,25,35,0.5);border:1px solid rgba(255,255,255,0.08);' +
                'border-radius:10px;padding:16px;margin-bottom:12px">' +
                '<div style="font-size:10px;font-weight:700;color:#c9a84c;letter-spacing:1.5px;' +
                'text-transform:uppercase;margin-bottom:8px">🎒 Trip Profile</div>' +
                (f'<div style="font-size:12px;color:#e8e0d5;margin-bottom:4px">{" · ".join(_trip_types)}</div>' if _trip_types else '') +
                (f'<div style="font-size:12px;color:#8a9bb0;margin-bottom:3px">{_priorities}</div>' if _priorities else '') +
                (f'<div style="font-size:12px;color:#8a9bb0">{_transport}</div>' if _transport else '') +
                '</div>',
                unsafe_allow_html=True
            )

        st.markdown("---")

        # Full itinerary collapsible
        if _s_itin:
            with st.expander("📋 View your full itinerary"):
                st.markdown(_s_itin)

        # AI support chat
        st.markdown("### 💬 Ask Sherpa anything about your trip")
        st.markdown(
            "*Got a question about your trip? Ask about visas, what to pack, "
            "local customs, restaurant tips, or anything else.*"
        )

        _support_context = f"""You are Sherpa, a friendly travel assistant. The user is planning this specific trip:

TRIP DETAILS:
- Destination: {_s_dest}
- Dates: {_s_date_str}{f" ({_s_nights} nights)" if _s_nights else ""}
- Group: {_s_profile.get("group_type","Not specified")}
- Budget: {_s_profile.get("budget","Not specified")}
- Trip type: {", ".join(_trip_types) if _trip_types else "Not specified"}
- Interests: {_s_profile.get("priorities","Not specified")}
- Transport: {"Hiring a car" if _s_car == "yes" else "No car hire" if _s_car == "no" else "Not decided"}
- Airport: {f"{_s_ap_name} ({_s_iata})" if _s_iata else "Not confirmed"}
- Arrival time: {_s_arr_t if _s_arr_t else "Not saved"}
- Departure time: {_s_dep_t if _s_dep_t else "Not saved"}
- Hotel: {_s_hotel if _s_hotel else "Not selected yet"}
- Flying from: {_s_profile.get("starting_point","Not specified")}

Answer questions about this trip helpfully and concisely. Keep responses practical and friendly."""

        # Chat history display
        for _msg in st.session_state.get("chat_history", []):
            _is_user = _msg["role"] == "user"
            _bg = "rgba(201,168,76,0.08)" if _is_user else "rgba(15,25,35,0.5)"
            _border = "rgba(201,168,76,0.2)" if _is_user else "rgba(255,255,255,0.08)"
            _label = "You" if _is_user else "Sherpa"
            _label_colour = "#c9a84c" if _is_user else "#8a9bb0"
            st.markdown(
                f'<div style="background:{_bg};border:1px solid {_border};' +
                f'border-radius:10px;padding:12px 16px;margin:6px 0;font-size:0.9rem">' +
                f'<span style="font-size:10px;color:{_label_colour};font-weight:700;letter-spacing:1px;' +
                f'text-transform:uppercase;display:block;margin-bottom:4px">{_label}</span>' +
                f'{_msg["content"]}</div>',
                unsafe_allow_html=True
            )

        # Quick-question chips (only when no chat history yet)
        if not st.session_state.get("chat_history"):
            st.markdown('<div style="font-size:0.75rem;color:#5f7080;margin:8px 0 6px">Quick questions:</div>', unsafe_allow_html=True)
            _dest_short = _s_dest.split(",")[0].strip()
            _quick_qs = [
                f"Do I need a visa for {_dest_short}?",
                f"What currency do they use in {_dest_short}?",
                f"What should I pack?",
                "Is it safe for tourists?",
                "Any local customs to know?",
                "Best way to get around?",
            ]
            _chip_cols = st.columns(3)
            for _ci, _q in enumerate(_quick_qs):
                with _chip_cols[_ci % 3]:
                    if st.button(_q, key=f"chip_{_ci}", use_container_width=True):
                        st.session_state.chat_history.append({"role": "user", "content": _q})
                        with st.spinner("Sherpa is thinking..."):
                            try:
                                _sr = claude_client.messages.create(
                                    model="claude-haiku-4-5-20251001",
                                    max_tokens=500,
                                    messages=[
                                        {"role": "user", "content": _support_context},
                                        {"role": "assistant", "content": "Understood, I have your trip details. What would you like to know?"},
                                        {"role": "user", "content": _q},
                                    ]
                                )
                                st.session_state.chat_history.append({"role": "assistant", "content": _sr.content[0].text.strip()})
                            except Exception as _se:
                                st.session_state.chat_history.append({"role": "assistant", "content": f"Sorry, something went wrong: {_se}"})
                        st.rerun()

        # Free-text chat input
        _user_q = st.chat_input("Ask anything about your trip to " + _s_dest.split(",")[0] + "...")
        if _user_q:
            st.session_state.chat_history.append({"role": "user", "content": _user_q})
            with st.spinner("Sherpa is thinking..."):
                try:
                    _history_for_api = []
                    for _hm in st.session_state.chat_history[:-1]:
                        _role = "user" if _hm["role"] == "user" else "assistant"
                        _history_for_api.append({"role": _role, "content": _hm["content"]})
                    _full_msgs = (
                        [{"role": "user", "content": _support_context},
                         {"role": "assistant", "content": "Understood, I have all your trip details. Ask me anything!"}]
                        + _history_for_api
                        + [{"role": "user", "content": _user_q}]
                    )
                    _sr2 = claude_client.messages.create(
                        model="claude-haiku-4-5-20251001",
                        max_tokens=600,
                        messages=_full_msgs
                    )
                    st.session_state.chat_history.append({"role": "assistant", "content": _sr2.content[0].text.strip()})
                except Exception as _se2:
                    st.session_state.chat_history.append({"role": "assistant", "content": f"Sorry, something went wrong: {_se2}"})
            st.rerun()

        if st.session_state.get("chat_history"):
            if st.button("🗑️ Clear chat"):
                st.session_state.chat_history = []
                st.rerun()