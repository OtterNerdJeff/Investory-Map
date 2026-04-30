#!/usr/bin/env python3
"""
Retheme Investory Map from dark to light.
Run from repo root: python3 retheme.py
"""
from pathlib import Path

SRC = Path("/home/user/Investory-Map/src")

# ─────────────────────────────────────────────────────────────────────────────
# Replacement pairs in ORDER — order matters to prevent double-replacement.
# Rule: if colour A maps to colour B, and colour C also maps to colour B,
#       colour A must be replaced BEFORE colour C is replaced with B.
# ─────────────────────────────────────────────────────────────────────────────
REPLACEMENTS = [
    # ── 1. Light "text on dark" colours → dark equivalents ───────────────────
    # These must run first so the source values are gone before we introduce
    # new #e2e8f0 values as border colours in phase 5.
    ('#e2e8f0', '#1e293b'),   # primary text (was white-ish on dark → dark slate)
    ('#a5b4fc', '#4338ca'),   # indigo accent text
    ('#818cf8', '#4f46e5'),   # indigo medium
    ('#4b5563', '#64748b'),   # muted grey
    ('#6b7280', '#64748b'),   # muted grey alt
    ('#374151', '#94a3b8'),   # dimmed text
    ('#9ca3af', '#475569'),   # secondary text
    ('#d4d0cb', '#64748b'),   # Others-status faint text

    # ── 2. Bright "light-on-dark" functional colours → darker equivalents ────
    ('#fca5a5', '#dc2626'),   # red badge/error text
    ('#c4b5fd', '#6d28d9'),   # purple badge text
    ('#6ee7b7', '#047857'),   # green (loan) text
    ('#93c5fd', '#1d4ed8'),   # blue (return) text
    ('#c084fc', '#7c3aed'),   # loan purple icon
    ('#4ade80', '#16a34a'),   # green OK / resolved
    ('#fcd34d', '#d97706'),   # amber maintenance text
    ('#fbbf24', '#d97706'),   # amber alt
    ('#facc15', '#d97706'),   # amber stat
    ('#f87171', '#dc2626'),   # light red
    ('#fb923c', '#c2410c'),   # orange
    ('#f97316', '#c2410c'),   # orange alt
    ('#34d399', '#059669'),   # bright green (admin badge)

    # ── 3. Dark page / card backgrounds → light equivalents ──────────────────
    ('#080b12', '#f8fafc'),   # page background
    ('#0a0d18', '#ffffff'),   # header background
    ('#0d1117', '#ffffff'),   # card background
    ('#0f1520', '#ffffff'),   # modal background
    ('#111827', '#f1f5f9'),   # secondary card / button bg
    ('#1a1d2e', '#ede9fe'),   # active / highlight state bg

    # ── 4. Dark status-badge / semantic backgrounds → light equivalents ───────
    ('#7f1d1d', '#fee2e2'),   # red badge bg  (error, fault)
    ('#4c1d95', '#f3e8ff'),   # purple bg
    ('#4a1d96', '#f3e8ff'),   # purple bg alt
    ('#064e3b', '#d1fae5'),   # green loan bg
    ('#1e3a5f', '#dbeafe'),   # blue return bg
    ('#312e81', '#e0e7ff'),   # indigo badge bg
    ('#1e1b4b', '#e0e7ff'),   # Spare dark bg
    ('#1c1917', '#f1f5f9'),   # Others dark bg
    ('#44403c', '#f1f5f9'),   # Others badge
    ('#422006', '#fef3c7'),   # Maintenance dark bg
    ('#78350f', '#fef3c7'),   # Maintenance badge
    ('#7c2d12', '#fff7ed'),   # High-sev bg
    ('#450a0a', '#fee2e2'),   # Condemned / Faulty dark bg
    ('#052e16', '#dcfce7'),   # Operational dark bg
    ('#14532d', '#dcfce7'),   # Operational badge

    # ── 5. Borders (dark → light) — introduces new #e2e8f0 values ────────────
    ('#1a1f35', '#e2e8f0'),   # heavy border
    ('#1e2432', '#e2e8f0'),   # standard border
    ('#2d3748', '#cbd5e1'),   # input / focus border
    ('#2d3148', '#cbd5e1'),   # scrollbar thumb

    # ── 6. rgba strings ───────────────────────────────────────────────────────
    ('rgba(0,0,0,.75)',        'rgba(15,23,42,0.5)'),   # modal overlay
    ('rgba(0,0,0,.92)',        'rgba(15,23,42,0.8)'),   # lightbox
    ('rgba(10,14,25,0.97)',    'rgba(255,255,255,0.97)'), # detail panel bg
    ('rgba(30,32,64,0.8)',     'rgba(248,250,252,0.95)'), # panel title bar
    ('rgba(15,18,32,0.8)',     'rgba(241,245,249,0.95)'), # panel title bar alt
    ('rgba(99,102,241,0.4)',   'rgba(99,102,241,0.2)'), # logo glow
    ('rgba(0,0,0,0.7)',        'rgba(15,23,42,0.4)'),
    ('rgba(0,0,0,0.5)',        'rgba(15,23,42,0.3)'),
]

files = list(SRC.rglob("*.tsx")) + list(SRC.rglob("*.ts"))

changed = []
for path in files:
    original = path.read_text()
    content = original
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
        content = content.replace(old.upper(), new)
    if content != original:
        path.write_text(content)
        changed.append(str(path.relative_to(SRC.parent)))

print(f"Modified {len(changed)} files:")
for f in sorted(changed):
    print(f"  {f}")
