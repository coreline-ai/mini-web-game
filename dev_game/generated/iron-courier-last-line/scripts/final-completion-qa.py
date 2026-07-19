#!/usr/bin/env python3
"""Fail unless every explicit image-polish plan deliverable has final evidence."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load(relative: str):
    return json.loads((ROOT / relative).read_text())


def main() -> None:
    failures = []
    require = lambda condition, message: failures.append(message) if not condition else None

    plan = (ROOT / "dev-plan/implement_20260712_112550.md").read_text()
    require("- [ ]" not in plan, "development plan still has unchecked tasks")
    require("상태: **COMPLETED" in plan, "development plan is not marked COMPLETED")

    manifest = load("assets/asset-manifest.json")
    require(len(manifest.get("images", [])) == 125, "manifest image count is not 125")
    require(manifest.get("physicalEntityAnimationFrames") == 252, "physical entity frame count is not 252")
    for item in [*manifest.get("stageBackgrounds", []), *manifest.get("images", [])]:
        require(item.get("status") == "approved", f"{item.get('id')} is not approved")
        for field in ("family", "pivot", "sourceSize", "runtimeSize", "renderOwner", "provenance"):
            require(bool(item.get(field)), f"{item.get('id')} missing {field}")
        require((ROOT / item["path"]).exists(), f"{item.get('id')} file missing")

    coverage = load("assets/qa/asset-coverage/current.json")
    require(all(value == 0 for value in coverage["summary"].values()), f"coverage findings remain: {coverage['summary']}")
    budget = load("assets/qa/performance/asset-budget.json")
    require(all(budget["passes"].values()), f"asset budget failed: {budget['passes']}")
    runtime = load("assets/qa/asset-coverage/after-phase7/runtime-art-qa.json")
    require(runtime.get("ok") is True, "runtime art QA is not passing")
    require(all(value == 0 for value in runtime.get("qualityMetrics", {}).values()), f"runtime metrics non-zero: {runtime.get('qualityMetrics')}")
    background = load("assets/qa/background-continuity/background-continuity.json")
    require(background.get("ok") is True, "background continuity QA is not passing")
    require((ROOT / background["video"]).stat().st_size > 100_000, "background continuity video is missing/empty")
    stability = load("assets/qa/stability/runtime-stability-qa.json")
    require(stability.get("ok") is True and stability.get("soakSeconds") >= 600, "600-second soak is not passing")
    require(stability.get("restartCount") == 10 and len(stability.get("restarts", [])) == 10, "10 restart samples are missing")
    require(not stability.get("browserErrors") and stability["summary"]["maxBgm"] <= 1, "stability error/BGM invariant failed")
    dpr = load("assets/qa/dpr/dpr3-asset-qa.json")
    require(dpr.get("ok") is True and dpr.get("deviceScaleFactor") == 3, "DPR3 QA is not passing")

    require(len(list((ROOT / "assets/qa/layout").glob("*.png"))) == 20, "layout capture matrix is incomplete")
    require(len(list((ROOT / "assets/qa/scene-composite").glob("*.png"))) == 20, "scene composite screenshot matrix is incomplete")
    require(len(list((ROOT / "assets/qa/scene-composite").glob("*.layout.json"))) == 20, "scene composite layout JSON matrix is incomplete")
    require(len(list((ROOT / "assets/qa/artboards").glob("0*.png"))) == 7, "seven approved artboards are missing")

    gap = load("assets/asset-gap-plan.json")
    require(gap.get("status") == "complete" and all(batch.get("status") == "completed" for batch in gap.get("batches", [])), "asset gap plan is not complete")
    gate = load("assets/qa/final-gate-report.json")
    require(gate["commands"]["productionGate"].get("status") == "pass" and gate["commands"]["productionGate"].get("exitCode") == 0, "production gate evidence is not passing")
    completion = load("assets/qa/completion-audit.json")
    require(completion.get("status") == "complete" and not completion.get("unresolvedRequiredItems"), "completion audit has unresolved items")
    summary = (ROOT / "docs/06-FINAL-QA-SUMMARY.md").read_text()
    require("최종 판정: **PASS" in summary, "final QA summary does not declare PASS")

    report = {"ok": not failures, "failures": failures, "checks": 15, "planUnchecked": plan.count("- [ ]")}
    out = ROOT / "assets/qa/final-completion-qa.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
