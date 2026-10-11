#!/usr/bin/env python3
"""Split one continuous TTS take of the whole script into per-line clips.

Usage: split_vo.py <full_take.wav> <lines.json> <out_dir>
The script was sent as paragraphs (one per line), so the N-1 longest pauses are the
line boundaries. Each clip keeps ~80ms of natural room tone at the head and ~200ms at the tail.
"""
import json, re, subprocess, sys
from pathlib import Path

src, lines_path, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
lines = json.loads(Path(lines_path).read_text())
n = len(lines)

log = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", "silencedetect=n=-42dB:d=0.18", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], capture_output=True, text=True).stdout)
gaps = [(e - s, s, e) for s, e in zip(starts, ends) if s > 0.05 and e < total - 0.05]
if len(gaps) < n - 1:
    sys.exit(f"only {len(gaps)} pauses found, need {n - 1}")
cuts = sorted(sorted(gaps, reverse=True)[: n - 1], key=lambda g: g[1])
print("boundary pauses:", [f"{s:.2f}-{e:.2f} ({d:.2f}s)" for d, s, e in cuts])
smallest_cut = min(d for d, _, _ in cuts)
next_gap = sorted(gaps, reverse=True)[n - 1][0] if len(gaps) >= n else 0
print(f"smallest boundary pause {smallest_cut:.2f}s vs largest in-line pause {next_gap:.2f}s")
if smallest_cut - next_gap < 0.08:
    print("WARNING: boundaries are ambiguous; verify the transcript of each clip")

lead = ends[0] if starts and starts[0] < 0.05 else 0.0
bounds = [lead] + [x for _, s, e in cuts for x in (s, e)] + [total]
out.mkdir(parents=True, exist_ok=True)
for i, (lid, _) in enumerate(lines):
    a, b = bounds[2 * i], bounds[2 * i + 1]
    a = max(0, a - 0.08); b = min(total, b + 0.2)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", src,
                    "-af", "afade=t=in:d=0.02,areverse,afade=t=in:d=0.06,areverse,highpass=f=70",
                    "-ar", "48000", "-ac", "1", str(out / f"{lid}.raw.wav")], check=True)
    print(f"{lid}: {a:6.2f} -> {b:6.2f}  ({b - a:.2f}s)")
