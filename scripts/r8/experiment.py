#!/usr/bin/env python3
"""Isolated build/control + official R8 diagnostic analyzer. Always restores source files."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request

from metrics import build_metrics, compare

BASELINE = "a3193b8361e32ea559d8350deaeb6a3e75041759"
SKILL_COMMIT = "c72942584fff970dac86ced78b367fce0c441e52"
ANALYZER_R8 = "9.4.34"
ROOT = Path(__file__).resolve().parents[2]
ANDROID = ROOT / "android"
RULES = ANDROID / "app/proguard-rules.pro"
SETTINGS = ANDROID / "settings.gradle"


def command(args, log, cwd=ANDROID):
    with Path(log).open("w") as output:
        process = subprocess.Popen(args, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        for line in process.stdout:
            print(line, end="", flush=True)
            output.write(line)
        if process.wait():
            raise subprocess.CalledProcessError(process.returncode, args)


def fetch_skill(destination):
    destination.mkdir(parents=True, exist_ok=True)
    paths = ["SKILL.md", "references/FULL_BUILD_CONFIG_ANALYZER.md", "references/INSPECT-RULES.md",
             "references/REPORT_FORMAT.md", "scripts/convert_pb_to_json.py", "scripts/analyze.py", "scripts/keep_radius_pb2.py"]
    provenance = {"repository": "https://github.com/android/skills", "commit": SKILL_COMMIT, "sha256": {}}
    for path in paths:
        url = f"https://raw.githubusercontent.com/android/skills/{SKILL_COMMIT}/performance/r8-analyzer/{path}"
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read()
        target = destination / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        provenance["sha256"][path] = hashlib.sha256(data).hexdigest()
    (destination / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["default", "analyzer"], required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "tmp/r8-experiment")
    args = parser.parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    original_rules, original_settings = RULES.read_bytes(), SETTINGS.read_bytes()
    baseline = subprocess.check_output(["git", "show", BASELINE + ":android/app/proguard-rules.pro"], cwd=ROOT)
    source = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    # Exactly one known redundant rule may change. Runtime/test infrastructure is
    # identical in both builds; this is NOT a whole-old-commit/new-commit comparison.
    active = lambda data: [line.strip() for line in data.decode().splitlines() if line.strip() and not line.lstrip().startswith("#")]
    removed = "-keep class com.nasrinai.movo.MovoNativePlugin { *; }"
    if active(original_rules) != [line for line in active(baseline) if line != removed]:
        raise RuntimeError("Candidate contains an unexpected keep-rule change")
    if b"com.android.tools:r8:" in original_settings:
        raise RuntimeError("Refuse to overwrite an existing R8 override")
    skill = output / "official-skill"
    if args.mode == "analyzer":
        fetch_skill(skill)
    try:
        if args.mode == "analyzer":
            override = ("pluginManagement {\n  buildscript {\n    repositories { google(); mavenCentral() }\n"
                        f"    dependencies {{ classpath('com.android.tools:r8:{ANALYZER_R8}') }}\n  }}\n}}\n")
            SETTINGS.write_bytes(override.encode() + original_settings)
        for label, rules in (("baseline", baseline), ("candidate", original_rules)):
            folder = output / args.mode / label
            if folder.exists():
                shutil.rmtree(folder)
            folder.mkdir(parents=True)
            RULES.write_bytes(rules)
            (folder / "proguard-rules.pro").write_bytes(rules)
            report_dir = ANDROID / "tmp/r8analysis"
            if report_dir.exists():
                shutil.rmtree(report_dir)
            report_dir.mkdir(parents=True)
            tasks = [":app:clean", ":app:assembleRelease", ":app:bundleRelease"]
            if args.mode == "default":
                tasks.append(":app:assembleReleaseAndroidTest")
            gradle = ["bash", "gradlew", *tasks, "--no-daemon", "--stacktrace", "--no-build-cache", "--rerun-tasks", "-PmovoR8ReleaseSmoke=true"]
            if args.mode == "analyzer":
                gradle.append("-Dcom.android.tools.r8.dumpkeepradiustodirectory=" + str(report_dir))
            command(gradle, folder / "build.log")
            shutil.copy2(ANDROID / "app/build/outputs/apk/release/app-release.apk", folder)
            shutil.copy2(ANDROID / "app/build/outputs/bundle/release/app-release.aab", folder)
            if args.mode == "default":
                shutil.copy2(ANDROID / "app/build/outputs/apk/androidTest/release/app-release-androidTest.apk", folder)
            shutil.copytree(ANDROID / "app/build/outputs/mapping/release", folder / "r8")
            if args.mode == "analyzer":
                if not list(report_dir.glob("*.pb")):
                    raise RuntimeError("R8 analyzer produced no proto; no placeholder scores permitted")
                shutil.copytree(report_dir, folder / "analysis")
                command([sys.executable, str(skill / "scripts/convert_pb_to_json.py"), str(folder / "analysis"),
                         str(folder / "analysis/keepruleradius.json")], folder / "convert.log", ROOT)
                decoded = json.loads((folder / "analysis/keepruleradius.json").read_text())
                if int(decoded.get("build_info", {}).get("live_class_count", 0)) <= 0 or not decoded.get("keep_rule_blast_radius_table"):
                    raise RuntimeError("Analyzer proto has no live classes/rules; refuse meaningless scores")
                command([sys.executable, str(skill / "scripts/analyze.py"), str(folder / "analysis/keepruleradius.json")], folder / "analyze.log", ROOT)
            metrics = build_metrics(folder, args.mode, label, source, hashlib.sha256(rules).hexdigest())
            if args.mode == "analyzer" and metrics["r8_version"] != ANALYZER_R8:
                raise RuntimeError("Temporary R8 override was not used")
            # Keep measured results reviewable in text logs as well as the ZIP.
            # This includes real analyzer scores/impact and artifact hashes.
            print(json.dumps(metrics, indent=2), flush=True)
        print(json.dumps(compare(output, args.mode), indent=2))
    finally:
        RULES.write_bytes(original_rules)
        SETTINGS.write_bytes(original_settings)
        if RULES.read_bytes() != original_rules or SETTINGS.read_bytes() != original_settings:
            raise RuntimeError("Failed to restore original Gradle settings/keep rules")


if __name__ == "__main__":
    main()
