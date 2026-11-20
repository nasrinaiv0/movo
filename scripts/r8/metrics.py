#!/usr/bin/env python3
"""Read real ZIP/DEX bytes and R8 metadata; compare rules only within one compiler."""
import hashlib
import json
from pathlib import Path
import re
import struct
import zipfile


def artifact(path):
    path = Path(path)
    dex = []
    with zipfile.ZipFile(path) as archive:
        for name in sorted(archive.namelist()):
            if not re.search(r"(?:^|/)classes(?:\d+)?\.dex$", name):
                continue
            data = archive.read(name)
            if len(data) < 112 or not data.startswith(b"dex\n"):
                raise ValueError("Invalid DEX: " + name)
            if struct.unpack_from("<I", data, 32)[0] != len(data):
                raise ValueError("DEX file_size mismatch: " + name)
            dex.append({"entry": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                        "field_references": struct.unpack_from("<I", data, 80)[0],
                        "method_references": struct.unpack_from("<I", data, 88)[0],
                        "class_definitions": struct.unpack_from("<I", data, 96)[0]})
    if not dex:
        raise ValueError("No DEX found in " + str(path))
    return {"file": path.name, "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "dex": dex,
            "dex_bytes": sum(entry["bytes"] for entry in dex)}


def build_metrics(folder, mode, label, source_sha, rules_sha):
    folder = Path(folder)
    mapping = (folder / "r8" / "mapping.txt").read_text()
    version = re.search(r"^# compiler_version:\s*(\S+)", mapping, re.M)
    if not version:
        raise ValueError("R8 mapping has no real compiler_version")
    result = {"mode": mode, "label": label, "source_sha": source_sha,
              "keep_rules_sha256": rules_sha, "r8_version": version.group(1),
              "apk": artifact(folder / "app-release.apk"), "aab": artifact(folder / "app-release.aab")}
    if mode == "analyzer":
        report = (folder / "analysis" / "analysis_result.txt").read_text()
        result["analyzer"] = json.loads(report[report.index("{"):])
    (folder / "metrics.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


def compare(output, mode):
    output = Path(output)
    before = json.loads((output / mode / "baseline" / "metrics.json").read_text())
    after = json.loads((output / mode / "candidate" / "metrics.json").read_text())
    if before["r8_version"] != after["r8_version"] or before["source_sha"] != after["source_sha"]:
        raise ValueError("Rule-only comparison requires identical R8 and source versions")
    result = {"mode": mode, "r8_version": before["r8_version"], "source_sha": before["source_sha"],
              "note": "Positive savings mean fewer bytes. APK/AAB totals include ZIP/signing effects; DEX is uncompressed.",
              "savings_bytes": {kind: {"container": before[kind]["bytes"] - after[kind]["bytes"],
                                      "dex": before[kind]["dex_bytes"] - after[kind]["dex_bytes"]}
                                for kind in ("apk", "aab")}}
    (output / mode / "comparison.json").write_text(json.dumps(result, indent=2) + "\n")
    return result
