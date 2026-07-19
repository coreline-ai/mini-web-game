#!/usr/bin/env python3
"""Remove superseded static/contact-sheet assets from the shipped public bundle."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
UNUSED_IDS = {
    "enemy-rifle-scavenger", "enemy-shield-breacher", "enemy-grenadier", "enemy-sentry-drone",
    "boss-dock-reclaimer", "boss-iron-mole", "vehicle-armored-transport",
}
CONTACT_SHEETS = [
    "assets/runtime/characters/enemies/enemy-lineup.png",
    "assets/runtime/characters/bosses/boss-lineup.png",
]


def main() -> None:
    manifest_path = ROOT / "assets/asset-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    removed_entries = [item for item in manifest.get("images", []) if item.get("id") in UNUSED_IDS]
    manifest["images"] = [item for item in manifest.get("images", []) if item.get("id") not in UNUSED_IDS]
    manifest["prunedRuntimeAssets"] = sorted(UNUSED_IDS)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    public_paths = [item["path"] for item in removed_entries] + CONTACT_SHEETS
    removed_files = 0
    for relative in public_paths:
        public_file = ROOT / "public" / relative
        if public_file.exists():
            public_file.unlink()
            removed_files += 1
    print(f"Pruned {len(removed_entries)} manifest entries and {removed_files} unused public runtime files; source/runtime masters preserved.")


if __name__ == "__main__":
    main()
