#!/bin/bash
# Usage: build/ingest.sh <take.mp4> <take.marks.json>
# Finds the black sync flash, shifts markers into video time, re-encodes the take
# (keyframe every 0.5s for exact seeks) into assets/take.mp4.
set -euo pipefail
TAKE="$1"; MARKS="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLASH=$(ffmpeg -hide_banner -t 6 -i "$TAKE" -vf "scale=320:-1,blackdetect=d=0.1:pic_th=0.98:pix_th=0.05" -an -f null - 2>&1 | grep -o "black_start:[0-9.]*" | head -1 | cut -d: -f2)
echo "flash at video t=$FLASH"
python3 - "$MARKS" "$FLASH" "$ROOT/assets/take.marks.json" <<'EOF'
import json, sys
marks = json.load(open(sys.argv[1])); flash = float(sys.argv[2])
sync = next(m["t"] for m in marks if m["name"] == "sync_on")
off = flash - sync
for m in marks: m["t"] = round(m["t"] + off, 3)
json.dump(marks, open(sys.argv[3], "w"), indent=1)
print("offset", round(off, 3))
EOF
ffmpeg -hide_banner -loglevel error -y -i "$TAKE" -c:v libx264 -preset slow -crf 15 -g 15 -keyint_min 15 -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart -an "$ROOT/assets/take.mp4"
ls -la "$ROOT/assets/take.mp4"
