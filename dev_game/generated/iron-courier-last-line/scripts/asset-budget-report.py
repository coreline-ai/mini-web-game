#!/usr/bin/env python3
"""Measure compressed payload and estimated decoded RGBA texture memory."""

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets/qa/performance"
DOWNLOAD_BUDGET = 64 * 1024 * 1024
DECODED_BUDGET = 320 * 1024 * 1024


def mib(value: int) -> float:
    return round(value / 1024 / 1024, 2)


def main() -> None:
    manifest = json.loads((ROOT / "assets/asset-manifest.json").read_text())
    seen = set()
    rows = []
    for item in manifest.get("images", []):
        path = ROOT / item["path"]
        if path in seen or not path.exists():
            continue
        seen.add(path)
        image = Image.open(path)
        compressed = path.stat().st_size
        decoded = image.width * image.height * 4
        rows.append({
            "id": item.get("id"), "path": item["path"], "width": image.width, "height": image.height,
            "compressedBytes": compressed, "decodedRgbaBytes": decoded,
        })
    audio_bytes = sum(path.stat().st_size for path in (ROOT / "assets/audio").glob("*") if path.is_file())
    image_bytes = sum(row["compressedBytes"] for row in rows)
    decoded_bytes = sum(row["decodedRgbaBytes"] for row in rows)
    initial_bytes = image_bytes + audio_bytes
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "imageCount": len(rows),
        "compressedImageBytes": image_bytes,
        "audioBytes": audio_bytes,
        "estimatedInitialAssetBytes": initial_bytes,
        "estimatedDecodedRgbaBytes": decoded_bytes,
        "budgets": {"initialAssetBytes": DOWNLOAD_BUDGET, "decodedRgbaBytes": DECODED_BUDGET},
        "passes": {"initialAssetBudget": initial_bytes <= DOWNLOAD_BUDGET, "decodedRgbaBudget": decoded_bytes <= DECODED_BUDGET},
        "largestDecoded": sorted(rows, key=lambda row: row["decodedRgbaBytes"], reverse=True)[:20],
        "optimization": {
            "regularEntityRuntimeCell": "384x384",
            "largeActorRuntimeCell": "512x512",
            "sourceMastersPreserved": True,
            "reason": "DPR3 actor fidelity with mobile-safe decoded texture budget",
        },
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "asset-budget.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    summary = f"""# Runtime asset budget

- Images: {len(rows)}
- Compressed images: {mib(image_bytes)} MiB
- Audio: {mib(audio_bytes)} MiB
- Estimated initial assets: {mib(initial_bytes)} / {mib(DOWNLOAD_BUDGET)} MiB — {'PASS' if initial_bytes <= DOWNLOAD_BUDGET else 'FAIL'}
- Estimated decoded RGBA: {mib(decoded_bytes)} / {mib(DECODED_BUDGET)} MiB — {'PASS' if decoded_bytes <= DECODED_BUDGET else 'FAIL'}
- Runtime cells: player/enemy 384×384, vehicle/boss 512×512; 512px+ source/cleaned masters are preserved.
"""
    (OUT_DIR / "asset-budget.md").write_text(summary)
    print(summary.strip())
    if not all(report["passes"].values()):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
