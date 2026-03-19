#!/usr/bin/env python3
"""seed_leads.py

Generate ~200 realistic mock Chilean leads and insert them into the
Supabase `leads` table via the PostgREST REST API.

Usage:
    cd data/
    python seed_leads.py
"""

import io
import json
import os
import random
import sys

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import requests

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE   = os.path.join(SCRIPT_DIR, "..", "nextjs", ".env.local")

NUM_LEADS = 200

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_env(path: str) -> dict:
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


def make_session(env: dict) -> tuple:
    """Returns (session, base_url)."""
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    service_key = env.get("PRIVATE_SUPABASE_SERVICE_KEY", "")
    if not base_url or not service_key:
        raise ValueError("Missing NEXT_PUBLIC_SUPABASE_URL or PRIVATE_SUPABASE_SERVICE_KEY in .env.local")

    session = requests.Session()
    session.headers.update({
        "apikey":        service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    })
    return session, f"{base_url}/rest/v1"


def api_check(resp: requests.Response, label: str):
    if not resp.ok:
        raise RuntimeError(f"{label} failed [{resp.status_code}]: {resp.text[:400]}")


# ── Chilean data ──────────────────────────────────────────────────────────────

FIRST_NAMES_MALE = [
    "Sebastián", "Matías", "Nicolás", "Benjamín", "Vicente",
    "Martín", "Joaquín", "Tomás", "Agustín", "Cristóbal",
    "Felipe", "Maximiliano", "Lucas", "Gabriel", "Diego",
    "Fernando", "Alejandro", "Daniel", "Francisco", "Ignacio",
    "Andrés", "José", "Carlos", "Pablo", "Ricardo",
    "Rodrigo", "Gonzalo", "Eduardo", "Camilo", "Álvaro",
]

FIRST_NAMES_FEMALE = [
    "Sofía", "Martina", "Florencia", "Valentina", "Isidora",
    "Agustina", "Catalina", "Fernanda", "Emilia", "Amanda",
    "Antonia", "Josefa", "María", "Javiera", "Constanza",
    "Francisca", "Daniela", "Camila", "Gabriela", "Carolina",
    "Paulina", "Andrea", "Claudia", "Lorena", "Natalia",
    "Macarena", "Bárbara", "Alejandra", "Pilar", "Isabel",
]

LAST_NAMES = [
    "González", "Muñoz", "Rojas", "Díaz", "Pérez",
    "Soto", "Contreras", "Silva", "Martínez", "Sepúlveda",
    "Morales", "Rodríguez", "López", "Fuentes", "Hernández",
    "García", "Garrido", "Bravo", "Reyes", "Núñez",
    "Jara", "Vera", "Torres", "Araya", "Figueroa",
    "Espinoza", "Cortés", "Castillo", "Tapia", "Valenzuela",
    "Acuña", "Vargas", "Fernández", "Vega", "Campos",
    "Sandoval", "Henríquez", "Castro", "Pizarro", "Álvarez",
]

OCCUPATIONS = {
    "executive": [
        "Gerente General", "Director Comercial", "Gerente de Finanzas",
        "CEO / Emprendedor", "Director de Operaciones",
    ],
    "professional_high": [
        "Médico", "Abogado", "Ingeniero Civil", "Arquitecto",
        "Ingeniero Comercial", "Dentista", "Piloto Comercial",
    ],
    "professional_mid": [
        "Contador Auditor", "Ingeniero Informático", "Profesor Universitario",
        "Psicólogo", "Enfermero/a", "Diseñador/a UX", "Periodista",
        "Kinesiólogo/a", "Administrador de Empresas",
    ],
    "general": [
        "Técnico en Enfermería", "Técnico en Administración", "Vendedor/a",
        "Asistente Administrativo/a", "Conductor Profesional",
        "Operador de Maquinaria", "Profesor/a de Educación Básica",
        "Peluquero/a", "Chef / Cocinero/a",
    ],
}

# Communes where leads currently live
COMUNAS_RESIDENCIA = [
    "Puente Alto", "Maipú", "La Florida", "San Bernardo", "Las Condes",
    "Peñalolén", "Pudahuel", "La Pintana", "Santiago", "El Bosque",
    "Quilicura", "Recoleta", "Ñuñoa", "Macul", "La Cisterna",
    "San Miguel", "Renca", "Cerrillos", "Estación Central", "Independencia",
    "Lo Prado", "Conchalí", "Lo Espejo", "Pedro Aguirre Cerda",
    "Providencia", "Vitacura", "Lo Barnechea", "La Reina",
    "Viña del Mar", "Valparaíso", "Concepción", "Temuco", "Rancagua",
]

SOURCES = ["web", "referral", "instagram", "facebook", "portal_inmobiliario"]
SOURCE_WEIGHTS = [30, 15, 20, 20, 15]

# ── RUT generation ────────────────────────────────────────────────────────────

def calc_rut_dv(rut_number: int) -> str:
    """Calculate the verification digit for a Chilean RUT using modulo 11."""
    total = 0
    multiplier = 2
    temp = rut_number
    while temp > 0:
        total += (temp % 10) * multiplier
        temp //= 10
        multiplier += 1
        if multiplier > 7:
            multiplier = 2
    remainder = 11 - (total % 11)
    if remainder == 11:
        return "0"
    if remainder == 10:
        return "K"
    return str(remainder)


def format_rut(rut_number: int) -> str:
    """Format a RUT number as XX.XXX.XXX-V."""
    dv = calc_rut_dv(rut_number)
    s = str(rut_number)
    # Add dots: from right, every 3 digits
    parts = []
    while len(s) > 3:
        parts.append(s[-3:])
        s = s[:-3]
    parts.append(s)
    formatted = ".".join(reversed(parts))
    return f"{formatted}-{dv}"


def generate_unique_ruts(count: int) -> list:
    """Generate `count` unique RUT numbers in range 7_000_000 – 25_000_000."""
    rut_numbers = random.sample(range(7_000_000, 25_000_001), count)
    return [format_rut(n) for n in rut_numbers]


# ── Lead generation ──────────────────────────────────────────────────────────

TIER_CONFIG = {
    "cold": {
        "score_range": (0, 39),
        "liquidaciones_range": (400_000, 800_000),
        "honorarios_range": (0, 100_000),
        "bancarizado_pct": 0.30,
        "ahorros_pct": 0.15,
        "occupation_pools": ["general", "professional_mid"],
    },
    "warm": {
        "score_range": (40, 59),
        "liquidaciones_range": (800_000, 1_500_000),
        "honorarios_range": (0, 300_000),
        "bancarizado_pct": 0.55,
        "ahorros_pct": 0.35,
        "occupation_pools": ["professional_mid", "professional_high"],
    },
    "hot": {
        "score_range": (60, 79),
        "liquidaciones_range": (1_200_000, 2_500_000),
        "honorarios_range": (0, 500_000),
        "bancarizado_pct": 0.75,
        "ahorros_pct": 0.55,
        "occupation_pools": ["professional_high", "executive"],
    },
    "premium": {
        "score_range": (80, 100),
        "liquidaciones_range": (2_000_000, 4_500_000),
        "honorarios_range": (0, 1_000_000),
        "bancarizado_pct": 0.90,
        "ahorros_pct": 0.75,
        "occupation_pools": ["executive", "professional_high"],
    },
}


def round_50k(value: int) -> int:
    """Round to nearest 50,000."""
    return round(value / 50_000) * 50_000


def generate_lead(tier: str, rut: str) -> dict:
    cfg = TIER_CONFIG[tier]

    # Name
    is_female = random.random() < 0.45
    first_name = random.choice(FIRST_NAMES_FEMALE if is_female else FIRST_NAMES_MALE)
    last1 = random.choice(LAST_NAMES)
    last2 = random.choice(LAST_NAMES)
    full_name = f"{first_name} {last1} {last2}"

    # Email (simplified, remove accents for email)
    email_name = first_name.lower()
    for old, new in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),("ñ","n")]:
        email_name = email_name.replace(old, new)
    email_last = last1.lower()
    for old, new in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),("ñ","n")]:
        email_last = email_last.replace(old, new)
    domain = random.choice(["gmail.com", "hotmail.com", "yahoo.cl", "outlook.com", "live.cl"])
    separator = random.choice([".", "_", ""])
    email = f"{email_name}{separator}{email_last}{random.randint(1,99)}@{domain}"

    # Phone
    phone = f"+569{random.randint(10000000, 99999999)}"

    # Age
    age = random.randint(25, 65)

    # Score (correlated with tier)
    score = random.randint(*cfg["score_range"])

    # Financial: RENTA
    liquidaciones = round_50k(random.randint(*cfg["liquidaciones_range"]))
    honorarios = round_50k(random.randint(*cfg["honorarios_range"]))
    arriendos = round_50k(random.randint(0, 300_000)) if random.random() < 0.20 else 0
    retiros = round_50k(random.randint(0, 200_000)) if random.random() < 0.10 else 0

    # Financial: EGRESOS
    cuota_credito_consumo = round_50k(random.randint(0, 200_000)) if random.random() < 0.40 else 0
    dividendo_actual = round_50k(random.randint(0, 350_000)) if random.random() < 0.25 else 0

    # Info personal
    bancarizado = random.random() < cfg["bancarizado_pct"]
    ahorros = random.random() < cfg["ahorros_pct"]

    # Occupation
    pool_name = random.choice(cfg["occupation_pools"])
    occupation = random.choice(OCCUPATIONS[pool_name])

    # Commune
    current_commune = random.choice(COMUNAS_RESIDENCIA)

    # Source
    source = random.choices(SOURCES, weights=SOURCE_WEIGHTS, k=1)[0]

    return {
        "quality_tier":           tier,
        "score":                  score,
        "age":                    age,
        "occupation":             occupation,
        "current_commune":        current_commune,
        "liquidaciones":          liquidaciones,
        "honorarios":             honorarios,
        "arriendos":              arriendos,
        "retiros":                retiros,
        "cuota_credito_consumo":  cuota_credito_consumo,
        "dividendo_actual":       dividendo_actual,
        "bancarizado":            bancarizado,
        "ahorros":                ahorros,
        "full_name":              full_name,
        "email":                  email,
        "phone":                  phone,
        "rut":                    rut,
        "status":                 "available",
        "source":                 source,
        "is_active":              True,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Loading .env.local ...")
    env = load_env(ENV_FILE)

    session, base_url = make_session(env)
    print(f"API endpoint: {base_url}")

    # Connectivity check
    r = session.get(f"{base_url}/leads", params={"limit": "1"})
    if not r.ok:
        print(f"ERROR: Cannot reach API [{r.status_code}]: {r.text[:200]}")
        sys.exit(1)
    print("API connection OK\n")

    # Tier distribution: 40% cold, 30% warm, 20% hot, 10% premium
    tier_counts = {
        "cold":    int(NUM_LEADS * 0.40),
        "warm":    int(NUM_LEADS * 0.30),
        "hot":     int(NUM_LEADS * 0.20),
        "premium": int(NUM_LEADS * 0.10),
    }
    # Adjust rounding so total == NUM_LEADS
    total_assigned = sum(tier_counts.values())
    tier_counts["cold"] += NUM_LEADS - total_assigned

    total_leads = sum(tier_counts.values())
    print(f"Generating {total_leads} leads:")
    for tier, count in tier_counts.items():
        print(f"  {tier:>8}: {count}")
    print()

    # Generate unique RUTs
    ruts = generate_unique_ruts(total_leads)

    # Build tier list
    tiers = []
    for tier, count in tier_counts.items():
        tiers.extend([tier] * count)
    random.shuffle(tiers)

    # Generate leads
    leads = []
    for i, tier in enumerate(tiers):
        lead = generate_lead(tier, ruts[i])
        leads.append(lead)

    # Delete existing leads
    print("Deleting existing leads ...")
    resp = session.delete(
        f"{base_url}/leads",
        params={"is_active": "not.is.null"},  # matches all rows
    )
    api_check(resp, "delete existing leads")
    print("  Done.\n")

    # Insert in batches
    batch_size = 50
    inserted = 0
    for i in range(0, len(leads), batch_size):
        batch = leads[i : i + batch_size]
        resp = session.post(
            f"{base_url}/leads",
            headers={"Prefer": "return=minimal"},
            data=json.dumps(batch, ensure_ascii=False),
        )
        api_check(resp, f"insert leads batch {i // batch_size + 1}")
        inserted += len(batch)
        print(f"  Inserted batch {i // batch_size + 1}: {len(batch)} leads (total: {inserted})")

    print(f"\nDone! Inserted {inserted} leads total.")

    # Verify distribution
    print("\nVerifying distribution ...")
    for tier in ["cold", "warm", "hot", "premium"]:
        resp = session.get(
            f"{base_url}/leads",
            params={"quality_tier": f"eq.{tier}", "select": "id"},
            headers={"Prefer": "count=exact"},
        )
        count = resp.headers.get("content-range", "")
        print(f"  {tier:>8}: {count}")

    print("\nAll leads have status = 'available' and is_active = true.")
    print("Run `SELECT * FROM leads_browsable` as an authenticated user to verify contact data is hidden.")


if __name__ == "__main__":
    main()
