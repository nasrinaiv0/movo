"""Bounded read-only diagnostics on the disposable macOS CI runner; no acceptance credit."""
import argparse
import json
from pathlib import Path
import subprocess

COMMANDS = (
    ("devices", ["xcrun", "simctl", "list", "devices", "available", "--json"], 20),
    ("memory", ["/usr/bin/vm_stat"], 10),
    ("disk", ["/bin/df", "-h"], 10),
    ("processes", ["/bin/ps", "-axo", "pid,ppid,state,etime,%cpu,%mem,comm"], 10),
    ("launch", ["/usr/bin/log", "show", "--last", "12m", "--style", "compact", "--predicate", 'eventMessage CONTAINS[c] "com.nasrinai.movo" OR subsystem BEGINSWITH "com.apple.CoreSimulator"'], 45),
)
LIMIT = 262144

def as_text(value):
    return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else value or ""

def collect(folder, runner=subprocess.run):
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=False)
    manifest = []
    for name, args, timeout in COMMANDS:
        try:
            result = runner(args, capture_output=True, text=True, timeout=timeout, check=False)
            status = {"exit_code": result.returncode}
            output = as_text(result.stdout) + "\n" + as_text(result.stderr)
        except subprocess.TimeoutExpired as exc:
            status = {"timeout": timeout}
            output = as_text(exc.stdout) + "\n" + as_text(exc.stderr)
        except OSError as exc:
            status = {"error": type(exc).__name__}
            output = str(exc)
        (folder / (name + ".txt")).write_text(output[-LIMIT:], encoding="utf-8")
        manifest.append({"name": name, **status, "truncated": len(output) > LIMIT})
    (folder / "manifest.json").write_text(json.dumps({"diagnostic_only": True, "commands": manifest}, indent=2) + "\n", encoding="utf-8")
    return manifest

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    collect(parser.parse_args().output)
