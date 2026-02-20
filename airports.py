# airports.py
# Maps city/region names to airport data including:
#   - iata: list of IATA airport codes (for reference)
#   - sky: Skyscanner city/airport code (used in deep links)
#          City codes like "LOND" search ALL airports in that city automatically.
#          Single-airport cities just use the IATA code e.g. "MAN".
#
# To add a new city: copy an existing entry and update the codes.
# Skyscanner city codes can be found by searching on skyscanner.net
# and checking the URL — e.g. skyscanner.net/transport/flights/lond/...

CITY_AIRPORTS = {

    # ── UK DEPARTURES ─────────────────────────────────────────────────────────
    # Cities with multiple airports use Skyscanner's city code so one search
    # covers all airports automatically
    "london":           {"iata": ["LHR", "LGW", "STN", "LTN", "LCY", "SEN"], "sky": "LOND"},
    "heathrow":         {"iata": ["LHR"],           "sky": "LHR"},
    "gatwick":          {"iata": ["LGW"],           "sky": "LGW"},
    "stansted":         {"iata": ["STN"],           "sky": "STN"},
    "luton":            {"iata": ["LTN"],           "sky": "LTN"},
    "london city":      {"iata": ["LCY"],           "sky": "LCY"},
    "southend":         {"iata": ["SEN"],           "sky": "SEN"},
    "manchester":       {"iata": ["MAN"],           "sky": "MAN"},
    "birmingham":       {"iata": ["BHX"],           "sky": "BHX"},
    "edinburgh":        {"iata": ["EDI"],           "sky": "EDI"},
    "glasgow":          {"iata": ["GLA", "PIK"],    "sky": "GLAS"},
    "prestwick":        {"iata": ["PIK"],           "sky": "PIK"},
    "bristol":          {"iata": ["BRS"],           "sky": "BRS"},
    "leeds":            {"iata": ["LBA"],           "sky": "LBA"},
    "bradford":         {"iata": ["LBA"],           "sky": "LBA"},
    "newcastle":        {"iata": ["NCL"],           "sky": "NCL"},
    "liverpool":        {"iata": ["LPL"],           "sky": "LPL"},
    "cardiff":          {"iata": ["CWL"],           "sky": "CWL"},
    "belfast":          {"iata": ["BFS", "BHD"],    "sky": "BELF"},
    "southampton":      {"iata": ["SOU"],           "sky": "SOU"},
    "norwich":          {"iata": ["NWI"],           "sky": "NWI"},
    "exeter":           {"iata": ["EXT"],           "sky": "EXT"},
    "east midlands":    {"iata": ["EMA"],           "sky": "EMA"},
    "nottingham":       {"iata": ["EMA"],           "sky": "EMA"},
    "leicester":        {"iata": ["EMA"],           "sky": "EMA"},
    "derby":            {"iata": ["EMA"],           "sky": "EMA"},
    "aberdeen":         {"iata": ["ABZ"],           "sky": "ABZ"},
    "inverness":        {"iata": ["INV"],           "sky": "INV"},
    "humberside":       {"iata": ["HUY"],           "sky": "HUY"},
    "doncaster":        {"iata": ["DSA"],           "sky": "DSA"},
    "sheffield":        {"iata": ["DSA"],           "sky": "DSA"},
    "bournemouth":      {"iata": ["BOH"],           "sky": "BOH"},
    "durham":           {"iata": ["MME"],           "sky": "MME"},
    "teesside":         {"iata": ["MME"],           "sky": "MME"},
    "newquay":          {"iata": ["NQY"],           "sky": "NQY"},
    "isle of man":      {"iata": ["IOM"],           "sky": "IOM"},
    "jersey":           {"iata": ["JER"],           "sky": "JER"},
    "guernsey":         {"iata": ["GCI"],           "sky": "GCI"},

    # ── EUROPE ────────────────────────────────────────────────────────────────

    # Portugal
    "lisbon":           {"iata": ["LIS"],           "sky": "LIS"},
    "porto":            {"iata": ["OPO"],           "sky": "OPO"},
    "faro":             {"iata": ["FAO"],           "sky": "FAO"},
    "funchal":          {"iata": ["FNC"],           "sky": "FNC"},
    "madeira":          {"iata": ["FNC"],           "sky": "FNC"},
    "ponta delgada":    {"iata": ["PDL"],           "sky": "PDL"},
    "azores":           {"iata": ["PDL"],           "sky": "PDL"},

    # Spain
    "madrid":           {"iata": ["MAD"],           "sky": "MAD"},
    "barcelona":        {"iata": ["BCN"],           "sky": "BCN"},
    "seville":          {"iata": ["SVQ"],           "sky": "SVQ"},
    "malaga":           {"iata": ["AGP"],           "sky": "AGP"},
    "alicante":         {"iata": ["ALC"],           "sky": "ALC"},
    "valencia":         {"iata": ["VLC"],           "sky": "VLC"},
    "ibiza":            {"iata": ["IBZ"],           "sky": "IBZ"},
    "mallorca":         {"iata": ["PMI"],           "sky": "PMI"},
    "palma":            {"iata": ["PMI"],           "sky": "PMI"},
    "menorca":          {"iata": ["MAH"],           "sky": "MAH"},
    "tenerife":         {"iata": ["TFS", "TFN"],   "sky": "TENE"},
    "gran canaria":     {"iata": ["LPA"],           "sky": "LPA"},
    "lanzarote":        {"iata": ["ACE"],           "sky": "ACE"},
    "fuerteventura":    {"iata": ["FUE"],           "sky": "FUE"},
    "bilbao":           {"iata": ["BIO"],           "sky": "BIO"},
    "murcia":           {"iata": ["RMU"],           "sky": "RMU"},

    # France
    "paris":            {"iata": ["CDG", "ORY"],   "sky": "PARI"},
    "nice":             {"iata": ["NCE"],           "sky": "NCE"},
    "lyon":             {"iata": ["LYS"],           "sky": "LYS"},
    "marseille":        {"iata": ["MRS"],           "sky": "MRS"},
    "bordeaux":         {"iata": ["BOD"],           "sky": "BOD"},
    "toulouse":         {"iata": ["TLS"],           "sky": "TLS"},
    "strasbourg":       {"iata": ["SXB"],           "sky": "SXB"},
    "nantes":           {"iata": ["NTE"],           "sky": "NTE"},
    "montpellier":      {"iata": ["MPL"],           "sky": "MPL"},
    "biarritz":         {"iata": ["BIQ"],           "sky": "BIQ"},

    # Italy
    "rome":             {"iata": ["FCO", "CIA"],   "sky": "ROME"},
    "milan":            {"iata": ["MXP","LIN","BGY"], "sky": "MILA"},
    "venice":           {"iata": ["VCE", "TSF"],   "sky": "VENI"},
    "florence":         {"iata": ["FLR", "PSA"],   "sky": "FLR"},
    "naples":           {"iata": ["NAP"],           "sky": "NAP"},
    "catania":          {"iata": ["CTA"],           "sky": "CTA"},
    "palermo":          {"iata": ["PMO"],           "sky": "PMO"},
    "bologna":          {"iata": ["BLQ"],           "sky": "BLQ"},
    "bari":             {"iata": ["BRI"],           "sky": "BRI"},
    "turin":            {"iata": ["TRN"],           "sky": "TRN"},
    "genoa":            {"iata": ["GOA"],           "sky": "GOA"},
    "pisa":             {"iata": ["PSA"],           "sky": "PSA"},
    "brindisi":         {"iata": ["BDS"],           "sky": "BDS"},
    "olbia":            {"iata": ["OLB"],           "sky": "OLB"},
    "cagliari":         {"iata": ["CAG"],           "sky": "CAG"},

    # Germany
    "berlin":           {"iata": ["BER"],           "sky": "BER"},
    "munich":           {"iata": ["MUC"],           "sky": "MUC"},
    "frankfurt":        {"iata": ["FRA", "HHN"],   "sky": "FRAN"},
    "hamburg":          {"iata": ["HAM"],           "sky": "HAM"},
    "dusseldorf":       {"iata": ["DUS"],           "sky": "DUS"},
    "cologne":          {"iata": ["CGN"],           "sky": "CGN"},
    "stuttgart":        {"iata": ["STR"],           "sky": "STR"},
    "hannover":         {"iata": ["HAJ"],           "sky": "HAJ"},
    "nuremberg":        {"iata": ["NUE"],           "sky": "NUE"},
    "bremen":           {"iata": ["BRE"],           "sky": "BRE"},
    "leipzig":          {"iata": ["LEJ"],           "sky": "LEJ"},
    "dortmund":         {"iata": ["DTM"],           "sky": "DTM"},

    # Austria
    "vienna":           {"iata": ["VIE"],           "sky": "VIE"},
    "salzburg":         {"iata": ["SZG"],           "sky": "SZG"},
    "innsbruck":        {"iata": ["INN"],           "sky": "INN"},
    "graz":             {"iata": ["GRZ"],           "sky": "GRZ"},

    # Switzerland
    "zurich":           {"iata": ["ZRH"],           "sky": "ZRH"},
    "geneva":           {"iata": ["GVA"],           "sky": "GVA"},
    "basel":            {"iata": ["BSL","MLH","EAP"], "sky": "BSL"},
    "bern":             {"iata": ["BRN"],           "sky": "BRN"},

    # Netherlands
    "amsterdam":        {"iata": ["AMS"],           "sky": "AMS"},
    "rotterdam":        {"iata": ["RTM"],           "sky": "RTM"},
    "eindhoven":        {"iata": ["EIN"],           "sky": "EIN"},

    # Belgium
    "brussels":         {"iata": ["BRU", "CRL"],   "sky": "BRUS"},
    "liege":            {"iata": ["LGG"],           "sky": "LGG"},
    "antwerp":          {"iata": ["ANR"],           "sky": "ANR"},

    # Ireland
    "dublin":           {"iata": ["DUB"],           "sky": "DUB"},
    "cork":             {"iata": ["ORK"],           "sky": "ORK"},
    "shannon":          {"iata": ["SNN"],           "sky": "SNN"},
    "knock":            {"iata": ["NOC"],           "sky": "NOC"},

    # Scandinavia
    "copenhagen":       {"iata": ["CPH"],           "sky": "CPH"},
    "oslo":             {"iata": ["OSL", "TRF"],   "sky": "OSLO"},
    "stockholm":        {"iata": ["ARN","BMA","NYO"], "sky": "STOC"},
    "gothenburg":       {"iata": ["GOT"],           "sky": "GOT"},
    "helsinki":         {"iata": ["HEL"],           "sky": "HEL"},
    "reykjavik":        {"iata": ["KEF"],           "sky": "KEF"},
    "bergen":           {"iata": ["BGO"],           "sky": "BGO"},
    "trondheim":        {"iata": ["TRD"],           "sky": "TRD"},
    "malmo":            {"iata": ["MMX"],           "sky": "MMX"},

    # Greece
    "athens":           {"iata": ["ATH"],           "sky": "ATH"},
    "thessaloniki":     {"iata": ["SKG"],           "sky": "SKG"},
    "heraklion":        {"iata": ["HER"],           "sky": "HER"},
    "crete":            {"iata": ["HER", "CHQ"],   "sky": "HER"},
    "chania":           {"iata": ["CHQ"],           "sky": "CHQ"},
    "mykonos":          {"iata": ["JMK"],           "sky": "JMK"},
    "santorini":        {"iata": ["JTR"],           "sky": "JTR"},
    "rhodes":           {"iata": ["RHO"],           "sky": "RHO"},
    "corfu":            {"iata": ["CFU"],           "sky": "CFU"},
    "kos":              {"iata": ["KGS"],           "sky": "KGS"},
    "zakynthos":        {"iata": ["ZTH"],           "sky": "ZTH"},
    "kefalonia":        {"iata": ["EFL"],           "sky": "EFL"},
    "skiathos":         {"iata": ["JSI"],           "sky": "JSI"},

    # Czech / Slovakia / Hungary / Poland
    "prague":           {"iata": ["PRG"],           "sky": "PRG"},
    "budapest":         {"iata": ["BUD"],           "sky": "BUD"},
    "warsaw":           {"iata": ["WAW", "WMI"],   "sky": "WARS"},
    "krakow":           {"iata": ["KRK"],           "sky": "KRK"},
    "bratislava":       {"iata": ["BTS"],           "sky": "BTS"},
    "wroclaw":          {"iata": ["WRO"],           "sky": "WRO"},
    "gdansk":           {"iata": ["GDN"],           "sky": "GDN"},
    "poznan":           {"iata": ["POZ"],           "sky": "POZ"},
    "katowice":         {"iata": ["KTW"],           "sky": "KTW"},

    # Balkans / Eastern Europe
    "dubrovnik":        {"iata": ["DBV"],           "sky": "DBV"},
    "split":            {"iata": ["SPU"],           "sky": "SPU"},
    "zagreb":           {"iata": ["ZAG"],           "sky": "ZAG"},
    "sarajevo":         {"iata": ["SJJ"],           "sky": "SJJ"},
    "belgrade":         {"iata": ["BEG"],           "sky": "BEG"},
    "sofia":            {"iata": ["SOF"],           "sky": "SOF"},
    "bucharest":        {"iata": ["OTP", "BBU"],   "sky": "BUCH"},
    "riga":             {"iata": ["RIX"],           "sky": "RIX"},
    "tallinn":          {"iata": ["TLL"],           "sky": "TLL"},
    "vilnius":          {"iata": ["VNO"],           "sky": "VNO"},
    "kyiv":             {"iata": ["KBP"],           "sky": "KBP"},
    "kiev":             {"iata": ["KBP"],           "sky": "KBP"},
    "tirana":           {"iata": ["TIA"],           "sky": "TIA"},
    "podgorica":        {"iata": ["TGD"],           "sky": "TGD"},
    "skopje":           {"iata": ["SKP"],           "sky": "SKP"},
    "chisinau":         {"iata": ["KIV"],           "sky": "KIV"},

    # Turkey
    "istanbul":         {"iata": ["IST", "SAW"],   "sky": "ISTA"},
    "ankara":           {"iata": ["ESB"],           "sky": "ESB"},
    "izmir":            {"iata": ["ADB"],           "sky": "ADB"},
    "antalya":          {"iata": ["AYT"],           "sky": "AYT"},
    "bodrum":           {"iata": ["BJV"],           "sky": "BJV"},
    "dalaman":          {"iata": ["DLM"],           "sky": "DLM"},

    # Cyprus / Malta
    "larnaca":          {"iata": ["LCA"],           "sky": "LCA"},
    "paphos":           {"iata": ["PFO"],           "sky": "PFO"},
    "cyprus":           {"iata": ["LCA", "PFO"],   "sky": "LCA"},
    "malta":            {"iata": ["MLA"],           "sky": "MLA"},

    # Russia
    "moscow":           {"iata": ["SVO","DME","VKO"], "sky": "MOSC"},
    "st petersburg":    {"iata": ["LED"],           "sky": "LED"},

    # ── MIDDLE EAST & AFRICA ──────────────────────────────────────────────────

    "dubai":            {"iata": ["DXB", "DWC"],   "sky": "DUBA"},
    "abu dhabi":        {"iata": ["AUH"],           "sky": "AUH"},
    "doha":             {"iata": ["DOH"],           "sky": "DOH"},
    "muscat":           {"iata": ["MCT"],           "sky": "MCT"},
    "riyadh":           {"iata": ["RUH"],           "sky": "RUH"},
    "jeddah":           {"iata": ["JED"],           "sky": "JED"},
    "kuwait":           {"iata": ["KWI"],           "sky": "KWI"},
    "bahrain":          {"iata": ["BAH"],           "sky": "BAH"},
    "amman":            {"iata": ["AMM"],           "sky": "AMM"},
    "beirut":           {"iata": ["BEY"],           "sky": "BEY"},
    "tel aviv":         {"iata": ["TLV"],           "sky": "TLV"},
    "cairo":            {"iata": ["CAI"],           "sky": "CAI"},
    "marrakech":        {"iata": ["RAK"],           "sky": "RAK"},
    "casablanca":       {"iata": ["CMN"],           "sky": "CMN"},
    "tunis":            {"iata": ["TUN"],           "sky": "TUN"},
    "algiers":          {"iata": ["ALG"],           "sky": "ALG"},
    "nairobi":          {"iata": ["NBO"],           "sky": "NBO"},
    "lagos":            {"iata": ["LOS"],           "sky": "LOS"},
    "accra":            {"iata": ["ACC"],           "sky": "ACC"},
    "addis ababa":      {"iata": ["ADD"],           "sky": "ADD"},
    "cape town":        {"iata": ["CPT"],           "sky": "CPT"},
    "johannesburg":     {"iata": ["JNB", "HLA"],   "sky": "JOHA"},
    "durban":           {"iata": ["DUR"],           "sky": "DUR"},

    # ── ASIA ──────────────────────────────────────────────────────────────────

    "tokyo":            {"iata": ["NRT", "HND"],   "sky": "TYOA"},
    "osaka":            {"iata": ["KIX", "ITM"],   "sky": "OSAA"},
    "kyoto":            {"iata": ["KIX"],           "sky": "KIX"},
    "nagoya":           {"iata": ["NGO"],           "sky": "NGO"},
    "fukuoka":          {"iata": ["FUK"],           "sky": "FUK"},
    "sapporo":          {"iata": ["CTS"],           "sky": "CTS"},
    "beijing":          {"iata": ["PEK", "PKX"],   "sky": "BEJD"},
    "shanghai":         {"iata": ["PVG", "SHA"],   "sky": "SHAA"},
    "hong kong":        {"iata": ["HKG"],           "sky": "HKG"},
    "guangzhou":        {"iata": ["CAN"],           "sky": "CAN"},
    "chengdu":          {"iata": ["CTU"],           "sky": "CTU"},
    "shenzhen":         {"iata": ["SZX"],           "sky": "SZX"},
    "seoul":            {"iata": ["ICN", "GMP"],   "sky": "SEOU"},
    "busan":            {"iata": ["PUS"],           "sky": "PUS"},
    "taipei":           {"iata": ["TPE"],           "sky": "TPE"},
    "singapore":        {"iata": ["SIN"],           "sky": "SIN"},
    "kuala lumpur":     {"iata": ["KUL"],           "sky": "KUL"},
    "bangkok":          {"iata": ["BKK", "DMK"],   "sky": "BKKK"},
    "phuket":           {"iata": ["HKT"],           "sky": "HKT"},
    "chiang mai":       {"iata": ["CNX"],           "sky": "CNX"},
    "ho chi minh":      {"iata": ["SGN"],           "sky": "SGN"},
    "saigon":           {"iata": ["SGN"],           "sky": "SGN"},
    "hanoi":            {"iata": ["HAN"],           "sky": "HAN"},
    "jakarta":          {"iata": ["CGK"],           "sky": "CGK"},
    "bali":             {"iata": ["DPS"],           "sky": "DPS"},
    "denpasar":         {"iata": ["DPS"],           "sky": "DPS"},
    "manila":           {"iata": ["MNL"],           "sky": "MNL"},
    "cebu":             {"iata": ["CEB"],           "sky": "CEB"},
    "colombo":          {"iata": ["CMB"],           "sky": "CMB"},
    "delhi":            {"iata": ["DEL"],           "sky": "DEL"},
    "mumbai":           {"iata": ["BOM"],           "sky": "BOM"},
    "bangalore":        {"iata": ["BLR"],           "sky": "BLR"},
    "chennai":          {"iata": ["MAA"],           "sky": "MAA"},
    "hyderabad":        {"iata": ["HYD"],           "sky": "HYD"},
    "kolkata":          {"iata": ["CCU"],           "sky": "CCU"},
    "goa":              {"iata": ["GOI"],           "sky": "GOI"},
    "kathmandu":        {"iata": ["KTM"],           "sky": "KTM"},
    "dhaka":            {"iata": ["DAC"],           "sky": "DAC"},
    "islamabad":        {"iata": ["ISB"],           "sky": "ISB"},
    "karachi":          {"iata": ["KHI"],           "sky": "KHI"},
    "lahore":           {"iata": ["LHE"],           "sky": "LHE"},

    # ── NORTH AMERICA ─────────────────────────────────────────────────────────

    "new york":         {"iata": ["JFK","LGA","EWR"],  "sky": "NYCA"},
    "los angeles":      {"iata": ["LAX","BUR","LGB"],  "sky": "LAXA"},
    "chicago":          {"iata": ["ORD", "MDW"],       "sky": "CHIA"},
    "miami":            {"iata": ["MIA","FLL","PBI"],  "sky": "MIAA"},
    "san francisco":    {"iata": ["SFO","OAK","SJC"],  "sky": "SFOA"},
    "dallas":           {"iata": ["DFW", "DAL"],       "sky": "DFWA"},
    "houston":          {"iata": ["IAH", "HOU"],       "sky": "HOUA"},
    "atlanta":          {"iata": ["ATL"],              "sky": "ATL"},
    "boston":           {"iata": ["BOS"],              "sky": "BOS"},
    "washington":       {"iata": ["IAD","DCA","BWI"],  "sky": "WASA"},
    "seattle":          {"iata": ["SEA"],              "sky": "SEA"},
    "denver":           {"iata": ["DEN"],              "sky": "DEN"},
    "las vegas":        {"iata": ["LAS"],              "sky": "LAS"},
    "orlando":          {"iata": ["MCO", "SFB"],       "sky": "ORLA"},
    "phoenix":          {"iata": ["PHX"],              "sky": "PHX"},
    "toronto":          {"iata": ["YYZ", "YTZ"],       "sky": "TORA"},
    "montreal":         {"iata": ["YUL"],              "sky": "YUL"},
    "vancouver":        {"iata": ["YVR"],              "sky": "YVR"},
    "calgary":          {"iata": ["YYC"],              "sky": "YYC"},
    "mexico city":      {"iata": ["MEX"],              "sky": "MEX"},
    "cancun":           {"iata": ["CUN"],              "sky": "CUN"},
    "guadalajara":      {"iata": ["GDL"],              "sky": "GDL"},
    "havana":           {"iata": ["HAV"],              "sky": "HAV"},
    "panama city":      {"iata": ["PTY"],              "sky": "PTY"},
    "bogota":           {"iata": ["BOG"],              "sky": "BOG"},
    "lima":             {"iata": ["LIM"],              "sky": "LIM"},
    "sao paulo":        {"iata": ["GRU", "CGH"],       "sky": "SAOP"},
    "rio de janeiro":   {"iata": ["GIG", "SDU"],       "sky": "RIOA"},
    "buenos aires":     {"iata": ["EZE", "AEP"],       "sky": "BUEA"},
    "santiago":         {"iata": ["SCL"],              "sky": "SCL"},
    "medellin":         {"iata": ["MDE"],              "sky": "MDE"},
    "cartagena":        {"iata": ["CTG"],              "sky": "CTG"},

    # ── OCEANIA ───────────────────────────────────────────────────────────────

    "sydney":           {"iata": ["SYD"],           "sky": "SYD"},
    "melbourne":        {"iata": ["MEL", "AVV"],   "sky": "MELB"},
    "brisbane":         {"iata": ["BNE"],           "sky": "BNE"},
    "perth":            {"iata": ["PER"],           "sky": "PER"},
    "adelaide":         {"iata": ["ADL"],           "sky": "ADL"},
    "gold coast":       {"iata": ["OOL"],           "sky": "OOL"},
    "cairns":           {"iata": ["CNS"],           "sky": "CNS"},
    "darwin":           {"iata": ["DRW"],           "sky": "DRW"},
    "auckland":         {"iata": ["AKL"],           "sky": "AKL"},
    "christchurch":     {"iata": ["CHC"],           "sky": "CHC"},
    "wellington":       {"iata": ["WLG"],           "sky": "WLG"},
    "queenstown":       {"iata": ["ZQN"],           "sky": "ZQN"},
    "fiji":             {"iata": ["NAN"],           "sky": "NAN"},
    "honolulu":         {"iata": ["HNL"],           "sky": "HNL"},

    # ── CARIBBEAN ─────────────────────────────────────────────────────────────

    "barbados":         {"iata": ["BGI"],           "sky": "BGI"},
    "jamaica":          {"iata": ["KIN", "MBJ"],   "sky": "JAMA"},
    "montego bay":      {"iata": ["MBJ"],           "sky": "MBJ"},
    "trinidad":         {"iata": ["POS"],           "sky": "POS"},
    "antigua":          {"iata": ["ANU"],           "sky": "ANU"},
    "st lucia":         {"iata": ["UVF", "SLU"],   "sky": "UVF"},
    "bahamas":          {"iata": ["NAS"],           "sky": "NAS"},
    "nassau":           {"iata": ["NAS"],           "sky": "NAS"},
    "punta cana":       {"iata": ["PUJ"],           "sky": "PUJ"},
    "santo domingo":    {"iata": ["SDQ"],           "sky": "SDQ"},
    "aruba":            {"iata": ["AUA"],           "sky": "AUA"},
    "curacao":          {"iata": ["CUR"],           "sky": "CUR"},
    "cayman islands":   {"iata": ["GCM"],           "sky": "GCM"},
    "turks and caicos": {"iata": ["PLS"],           "sky": "PLS"},
    "st maarten":       {"iata": ["SXM"],           "sky": "SXM"},
    "grenada":          {"iata": ["GND"],           "sky": "GND"},
    "martinique":       {"iata": ["FDF"],           "sky": "FDF"},
    "guadeloupe":       {"iata": ["PTP"],           "sky": "PTP"},
}


def _lookup(city_name):
    """Internal: returns the data dict for a city or None."""
    if not city_name:
        return None
    key = city_name.lower().strip()
    if key in CITY_AIRPORTS:
        return CITY_AIRPORTS[key]
    for city, data in CITY_AIRPORTS.items():
        if key in city or city in key:
            return data
    return None


def get_iata_codes(city_name):
    """Returns list of IATA codes for a city. Empty list if not found."""
    data = _lookup(city_name)
    return data["iata"] if data else []


def get_sky_code(city_name):
    """
    Returns the Skyscanner city/airport code for deep links.
    City codes (e.g. LOND, PARI) search ALL airports in that city.
    Falls back to first IATA code if not found.
    """
    data = _lookup(city_name)
    if data:
        return data["sky"]
    return ""


def get_primary_iata(city_name):
    """Returns the primary (first) IATA code for a city."""
    codes = get_iata_codes(city_name)
    return codes[0] if codes else ""


def get_all_iata_string(city_name):
    """Returns all IATA codes as a comma-separated string e.g. 'LHR, LGW, STN'"""
    codes = get_iata_codes(city_name)
    return ", ".join(codes) if codes else ""


# ── Nearest airport fallback ──────────────────────────────────────────────────
# Returns up to 3 airports that serve the destination with UK connectivity.
# Each airport dict: {iata, sky, airport_name, transfer_label, transfer_mins, uk_note}
_nearest_cache = {}  # keyed by dest_name.lower() → list of airport dicts

def get_nearest_airport(dest_name, claude_client):
    """
    Returns a list of dicts, one per viable arrival airport for dest_name.
    Each dict: {iata, sky, airport_name, transfer_label, transfer_mins, uk_note}
    
    Priority:
    1. Only airports with direct or easy 1-stop flights from UK
    2. Ordered by transfer time to destination (closest first)
    3. Up to 3 options
    
    Cached per session to avoid repeated API calls.
    """
    import json, re
    key = dest_name.lower().strip()

    # Return cached result
    if key in _nearest_cache:
        return _nearest_cache[key]

    # Check local DB for known IATA codes (used as a hint to Claude)
    data    = _lookup(dest_name)
    db_iatas = data["iata"][:3] if data else None
    db_sky   = data["sky"]      if data else None

    # Always ask Claude for full details including accurate transfer times to the
    # SPECIFIC destination (not just "city centre")
    try:
        db_hint = (
            f"Note: the IATA codes for this destination are known to be {db_iatas} — "
            f"use these but still provide all other fields accurately.\n\n"
            if db_iatas else ""
        )
        prompt = (
            f'A UK traveller wants to fly to "{dest_name}". List specific named airports with IATA codes — never return a region name.\n\n'
            + db_hint +
            'CRITICAL RULES:\n'
            '- ONLY include airports with direct flights OR easy 1-stop connections from UK airports (LHR, LGW, STN, MAN, EDI, BHX, BRS etc.)\n'
            '- If the nearest airport has NO UK flights, skip it and use the next closest that does\n'
            f'- transfer_label MUST be the journey time from the airport to "{dest_name}" SPECIFICALLY\n'
            f'  If {dest_name} is a town, village or resort (not a major city), give transfer time to that exact place — not just to the nearest city.\n'
            '- Include the transport mode in transfer_label e.g. "55 min by train + 10 min taxi" or "40 min by metro"\n'
            f'- Order by transfer time to {dest_name} (shortest first)\n'
            '- Maximum 3 airports\n\n'
            'Return ONLY a valid JSON array, no other text:\n'
            '[\n'
            '  {\n'
            '    "airport_name": "Full airport name",\n'
            '    "iata": "3-letter IATA code",\n'
            '    "sky": "Skyscanner code (city code like ROME or airport code like LIS)",\n'
            '    "transfer_mins": 45,\n'
            '    "transfer_label": "35 min by train + 10 min walk",\n'
            '    "transfer_legs": [\n'
            '      {"mode": "Train", "mins": 35, "detail": "Airport express to city centre"},\n'
            '      {"mode": "Walk", "mins": 10, "detail": "To hotel area"}\n'
            '    ],\n'
            '    "uk_note": "Direct from LGW, STN / 1-stop via FCO / etc"\n'
            '  }\n'
            ']\n\n'
            'If only 1 or 2 airports serve this destination with UK flights, return only those.\n'
            'Return only the JSON array.'
        )

        response = claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}]
        )
        raw   = response.content[0].text.strip()
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            airports = json.loads(match.group())
            results  = []
            for ap in airports[:3]:
                ap["from_db"] = False
                results.append(ap)
            if results:
                # Patch in db_sky if Claude didn't return a sky code
                if db_sky:
                    for r in results:
                        if not r.get("sky"):
                            r["sky"] = db_sky
                _nearest_cache[key] = results
                return results
    except Exception:
        pass

    # Hard fallback — single entry
    fallback = [{
        "iata":           "",
        "sky":            dest_name.upper()[:4],
        "airport_name":   f"Nearest airport to {dest_name}",
        "transfer_label": None,
        "transfer_mins":  None,
        "transfer_legs":  [],
        "uk_note":        None,
        "from_db":        False,
    }]
    _nearest_cache[key] = fallback
    return fallback