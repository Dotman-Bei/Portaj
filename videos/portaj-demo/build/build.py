#!/usr/bin/env python3
"""Generates index.html for the Portaj demo from the take's markers and the edit plan.

Inputs:  assets/take.marks.json (marker times are in *video* seconds after sync),
         assets/vo/*.wav (durations), edit plan below.
Output:  index.html (one standalone HyperFrames composition).

Coordinates: the page was recorded at 1280x720 CSS px. The footage fills the
1920x1080 frame, so 1 CSS px = 1.5 output px.
"""
import json, subprocess, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
marks = json.loads((ROOT / "assets/take.marks.json").read_text())
M = {m["name"]: m for m in marks}
K = 1.5  # CSS px -> output px


def t(name, d=0.0):
    return M[name]["t"] + d


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)


VO = {f"v{i:02d}": dur(ROOT / f"assets/vo/v{i:02d}.wav") for i in range(1, 12)}

plan = json.loads((ROOT / "build/plan.json").read_text())

# ---- landing (screenshot layer), then take ranges laid end to end -------------
L = plan["landing"]
landing_start = plan["screen_start"]
cursor = landing_start + L["dur"]
segs = []
for s in plan["segments"]:
    a = t(s["from"], s.get("from_d", 0)); b = t(s["to"], s.get("to_d", 0)); rate = s.get("rate", 1)
    length = (b - a) / rate
    segs.append({"id": s["id"], "src_in": a, "src_out": b, "rate": rate, "start": cursor, "dur": length})
    cursor += length
screen_end = cursor


def tl_of(take_t):
    """Map a take time to final-cut time (first segment containing it)."""
    for s in segs:
        if s["src_in"] - 1e-6 <= take_t <= s["src_out"] + 1e-6:
            return s["start"] + (take_t - s["src_in"]) / s["rate"]
    raise ValueError(f"take time {take_t} not in any segment")


def resolve(x):
    """Time spec: number (final-cut seconds) or {"mark": name, "d": offset} (take time)."""
    if isinstance(x, (int, float)):
        return float(x)
    base = tl_of(t(x["mark"], x.get("md", 0)))
    return base + x.get("d", 0)


# ---- VO (never overlapping; at least 0.3s air between lines) -------------
vo = []
for v in [v for v in plan["vo"] if not v.get("on_end_card")]:
    st = resolve(v["at"])
    if vo and st < vo[-1]["start"] + vo[-1]["dur"] + 0.3:
        print(f"  ! {v['id']} pushed {vo[-1]['start'] + vo[-1]['dur'] + 0.3 - st:.2f}s to avoid overlap")
        st = vo[-1]["start"] + vo[-1]["dur"] + 0.3
    vo.append({"id": v["id"], "start": st, "dur": VO[v["id"]]})

EC = plan["end_card"]
end_card_start = max(resolve(EC["at"]), vo[-1]["start"] + vo[-1]["dur"] + EC.get("after_vo", 0.4))
if end_card_start > screen_end - 0.8:
    print(f"  ! footage ends {screen_end:.2f}; end card wants {end_card_start:.2f} - clamped")
    end_card_start = screen_end - 0.8
for v in [v for v in plan["vo"] if v.get("on_end_card")]:
    vo.append({"id": v["id"], "start": end_card_start + EC.get("vo_delay", 0.9), "dur": VO[v["id"]]})
total = round(max(end_card_start + EC["hold"], vo[-1]["start"] + vo[-1]["dur"] + EC.get("tail", 2.4)), 2)

# ---- camera ---------------------------------------------------------------
# keys: at, scale, focus [x,y] CSS px in the viewport = where the camera looks,
# anchor [ax, ay] (0..1) = where in the frame that point sits (default centre).
cam = []
for c in plan["camera"]:
    at = resolve(c["at"]); s = c["scale"]
    fx, fy = c.get("focus", [640, 360]); ax, ay = c.get("anchor", [0.5, 0.5])
    px, py = fx * K, fy * K
    x = 1920 * ax - px * s; y = 1080 * ay - py * s
    x = min(0, max(1920 - 1920 * s, x)); y = min(0, max(1080 - 1080 * s, y))
    cam.append({"at": round(at, 3), "scale": s, "x": round(x, 1), "y": round(y, 1), "dur": c.get("dur", 1.2), "ease": c.get("ease", "power2.inOut")})

# ---- SFX ------------------------------------------------------------------
sfx = []
for i, s in enumerate(plan["sfx"]):
    try:
        at = resolve(s["at"])
    except ValueError:
        continue
    sfx.append({"id": f"sfx{i:02d}", "file": s["file"], "start": round(at, 3), "vol": s.get("vol", 0.5)})

# ---- music automation (duck under VO) -------------------------------------
bed = plan["music"]
lvl_full, lvl_duck = bed["full"], bed["duck"]
# Spans of speech; gaps shorter than 2.5s stay ducked so the bed doesn't pump.
spans = []
for v in sorted(vo, key=lambda v: v["start"]):
    a, b = v["start"] - 0.3, v["start"] + v["dur"] + 0.2
    if spans and a - spans[-1][1] < 2.5:
        spans[-1][1] = max(spans[-1][1], b)
    else:
        spans.append([a, b])
pts = [(0.0, 0.0), (1.8, lvl_full)]
for a, b in spans:
    pts += [(max(a - 0.4, pts[-1][0] + 0.05), lvl_full), (a, lvl_duck), (b, lvl_duck), (b + 0.9, lvl_full)]
pts += [(max(total - 2.8, pts[-1][0] + 0.05), lvl_full), (total, 0.0)]
music_lane = {"version": 1, "lanes": [{"target": "volume", "points": [{"t": round(a, 3), "v": round(b, 4)} for a, b in pts]}]}

# ---- emit ---------------------------------------------------------------
tpl = (ROOT / "build/template.html").read_text()
videos = "\n".join(
    f'        <video id="seg-{s["id"]}" class="seg" src="assets/take.mp4" muted playsinline data-start="{s["start"]:.3f}" data-duration="{s["dur"]:.3f}" '
    f'data-media-start="{s["src_in"]:.3f}"{"" if s["rate"] == 1 else f" data-playback-rate=\"{s["rate"]}\""} data-track-index="1"></video>'
    for s in segs)
vo_tags = "\n".join(
    f'    <audio id="vo-{v["id"]}" src="assets/vo/{v["id"]}.wav" data-start="{v["start"]:.3f}" data-duration="{v["dur"]:.3f}" data-track-index="10" data-volume="1"></audio>'
    for v in vo)
sfx_tags = "\n".join(
    f'    <audio id="{s["id"]}" src="assets/sfx/{s["file"]}" data-start="{s["start"]:.3f}" data-duration="{dur(ROOT / 'assets/sfx' / s['file']):.3f}" data-track-index="{12 + (i % 2)}" data-volume="{s["vol"]}"></audio>'
    for i, s in enumerate(sfx))
music_tag = (f'    <audio id="music-bed" src="assets/music/bed.wav" data-start="0" data-duration="{total}" data-media-start="{bed["media_start"]}" '
             f'data-track-index="11" data-volume="1" data-automation=\'{json.dumps(music_lane)}\'></audio>')

out = (tpl.replace("{{TOTAL}}", f"{total}")
          .replace("{{SCREEN_START_PLUS}}", f"{plan['screen_start'] + 1.0:.3f}")
          .replace("{{SCREEN_START}}", f"{plan['screen_start']}")
          .replace("{{SCREEN_DUR}}", f"{end_card_start + 0.8 - plan['screen_start']:.3f}")
          .replace("{{END_START}}", f"{end_card_start:.3f}")
          .replace("{{END_DUR}}", f"{total - end_card_start:.3f}")
          .replace("{{VIDEOS}}", videos)
          .replace("{{VO}}", vo_tags)
          .replace("{{SFX}}", sfx_tags)
          .replace("{{MUSIC}}", music_tag)
          .replace("{{CAMERA}}", json.dumps(cam))
          .replace("{{LANDING_START}}", f"{landing_start:.3f}")
          .replace("{{LANDING_DUR}}", f"{L['dur']:.3f}")
          .replace("{{SEGCUTS}}", json.dumps([round(s["start"], 3) for s in segs])))
(ROOT / "index.html").write_text(out)

# sub-compositions
SUB = ROOT / "build/sub"
(ROOT / "compositions").mkdir(exist_ok=True)
(ROOT / "compositions/title-card.html").write_text((SUB / "title-card.html").read_text().replace("{{SCREEN_START}}", f"{plan['screen_start']}"))
(ROOT / "compositions/end-card.html").write_text((SUB / "end-card.html").read_text())
(ROOT / "compositions/landing.html").write_text((SUB / "landing.html").read_text().replace("{{SCROLL}}", json.dumps([{"at": k["at"], "y": k["y"], "dur": k["dur"], "ease": k.get("ease", "power2.inOut")} for k in L["scroll"]])))

report = {"total": total, "screen_end": round(screen_end, 3), "end_card": round(end_card_start, 3),
          "segments": [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in s.items()} for s in segs],
          "vo": [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in x.items()} for x in vo],
          "camera": cam}
(ROOT / "build/edl.json").write_text(json.dumps(report, indent=1))
print(json.dumps({"total": total, "screen_end": round(screen_end, 2), "end_card": round(end_card_start, 2)}))
for x in vo:
    print(f'  {x["id"]} {x["start"]:6.2f} -> {x["start"] + x["dur"]:6.2f}')
for s in segs:
    print(f'  seg {s["id"]:<14} {s["start"]:6.2f} -> {s["start"] + s["dur"]:6.2f}  take {s["src_in"]:.2f}-{s["src_out"]:.2f} x{s["rate"]}')
