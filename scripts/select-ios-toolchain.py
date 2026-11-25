#!/usr/bin/env python3
"""Prefer an installed stable Xcode >=27.1; do not pretend an older SDK certifies Duo."""
import argparse
import glob
import os
import plistlib
import re
import subprocess


def stable_version(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d+(?:\.\d+){0,2}", value):
        return None
    return tuple((list(map(int, value.split("."))) + [0, 0])[:3])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-duo", action="store_true")
    args = parser.parse_args()
    candidates = []
    for app in glob.glob("/Applications/Xcode*.app"):
        try:
            with open(os.path.join(app, "Contents", "Info.plist"), "rb") as source:
                value = plistlib.load(source).get("CFBundleShortVersionString")
            version = stable_version(value)
            if version and "beta" not in app.lower() and "rc" not in app.lower():
                candidates.append((version, os.path.join(app, "Contents", "Developer")))
        except (OSError, ValueError, plistlib.InvalidFileException):
            continue
    if not candidates:
        raise SystemExit("No installed stable Xcode found")
    version, developer = max(candidates)
    if args.require_duo and version < (27, 1, 0):
        raise SystemExit("Duo acceptance requires Xcode 27.1+; this runner has no qualifying toolchain")
    if os.environ.get("GITHUB_ENV"):
        with open(os.environ["GITHUB_ENV"], "a", encoding="utf-8") as target:
            target.write(f"DEVELOPER_DIR={developer}\n")
    env = {**os.environ, "DEVELOPER_DIR": developer}
    subprocess.run(["xcodebuild", "-version"], env=env, check=True)
    subprocess.run(["xcrun", "--sdk", "iphoneos", "--show-sdk-version"], env=env, check=True)
    if version < (27, 1, 0):
        print("::notice::Duo full-display acceptance remains pending: installed stable Xcode is older than 27.1")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as target:
            target.write(f"Selected stable Xcode {'.'.join(map(str, version))}. "
                         + ("Duo toolchain available; device/pose acceptance is separate.\n" if version >= (27, 1, 0)
                            else "Duo SDK/pose acceptance is NOT established by this run.\n"))


if __name__ == "__main__":
    main()
