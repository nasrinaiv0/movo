#!/usr/bin/env python3
"""Run the required MOVO native launch/deep-link smoke test on a GitHub macOS runner.

Linux/Vercel Sandbox can unit-test the orchestration, but only a macOS runner can
execute xcrun and establish that the iOS app actually launched.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time


BUNDLE_ID = "com.nasrinai.movo"


class SmokeFailure(Exception):
    def __init__(self, message, *, timed_out=False):
        super().__init__(message)
        self.timed_out = timed_out


def run_command(args, timeout):
    print("+", " ".join(args), flush=True)
    try:
        result = subprocess.run(args, text=True, capture_output=True, timeout=timeout, check=False)
    except subprocess.TimeoutExpired as error:
        raise SmokeFailure(f"{args[0]} {args[1:]} timed out after {timeout}s", timed_out=True) from error
    if result.stdout and args[1:3] != ["simctl", "bootstatus"]:
        print(result.stdout[-3000:], flush=True)
    if result.returncode:
        details = (result.stderr or result.stdout or "").strip()[-3000:]
        raise SmokeFailure(f"{args} exited {result.returncode}: {details}")
    return result.stdout


def choose_iphone(simulator_json):
    try:
        data = json.loads(simulator_json)
        phones = []
        for runtime, devices in data["devices"].items():
            # Prefer the newest installed iOS runtime. The runner may ship older
            # runtimes that don't match the selected Xcode version.
            match = re.search(r"(?:^|[.])iOS[- ](\d+)[._-](\d+)", runtime)
            version = tuple(map(int, match.groups())) if match else (-1, -1)
            for device in devices:
                if (device.get("isAvailable") and "iPhone" in device.get("name", "")
                        and device.get("udid")):
                    phones.append({**device, "_runtime": runtime, "_version": version})
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        raise SmokeFailure("Could not parse available CoreSimulator devices") from error
    if not phones:
        raise SmokeFailure("No available iPhone Simulator on the macOS runner")
    return sorted(
        phones,
        key=lambda device: (
            -device["_version"][0],
            -device["_version"][1],
            device.get("state") != "Booted",
            device.get("name", ""),
        ),
    )[0]



def launch_with_cold_boot_retry(device_id, *, runner=run_command, sleeper=time.sleep):
    """Retry only a launch TIMEOUT: startup can lag after slow CoreSimulator migrations.

    Never retry a nonzero app-launch exit code, which may represent an app crash.
    A second timeout must still fail CI; no launch step is skipped.
    """
    launch = ["xcrun", "simctl", "launch", device_id, BUNDLE_ID]
    for attempt in (1, 2):
        try:
            runner(launch, timeout=180)
            return
        except SmokeFailure as error:
            if not error.timed_out or attempt == 2:
                raise
            print("::warning::CoreSimulator launch timed out on first attempt; "
                  "waiting 15 seconds for post-boot services, then retrying once.", flush=True)
            sleeper(15)
    raise SmokeFailure("Simulator launch did not complete")


def capture_screenshot_with_timeout_retry(device_id, screenshot, *, runner=run_command, sleeper=time.sleep):
    """Retry one CoreSimulator screenshot timeout without masking repeat failures.

    App install, launch and deep-link failures remain hard failures. A second
    screenshot timeout or a non-timeout error still fails the iOS CI gate.
    """
    command = ["xcrun", "simctl", "io", device_id, "screenshot", screenshot]
    for attempt in (1, 2):
        try:
            runner(command, timeout=90)
            return
        except SmokeFailure as error:
            if not error.timed_out or attempt == 2:
                raise
            print("::warning::CoreSimulator screenshot timed out; "
                  "waiting 15 seconds and retrying once.", flush=True)
            sleeper(15)
    raise SmokeFailure("Simulator screenshot failed after bounded retries")


def smoke(app, screenshot):
    if not os.path.isdir(app):
        raise SmokeFailure(f"Simulator .app is missing: {app}")
    device = choose_iphone(run_command(["xcrun", "simctl", "list", "devices", "available", "--json"], 30))
    device_id = device["udid"]
    print(f"Simulator selected: {device['name']} ({device_id}), "
          f"runtime={device.get('_runtime')}, state={device.get('state')}", flush=True)
    if device.get("state") != "Booted":
        run_command(["xcrun", "simctl", "boot", device_id], 90)
    print("Waiting for complete CoreSimulator first boot (up to 10 minutes).", flush=True)
    run_command(["xcrun", "simctl", "bootstatus", device_id, "-b"], 600)
    run_command(["xcrun", "simctl", "install", device_id, app], 180)
    launch_with_cold_boot_retry(device_id)
    time.sleep(5)
    run_command(["xcrun", "simctl", "openurl", device_id,
                 "movo://log?src=siri_shortcut&amount=12.34&merchant=Simulator%20Test"], 90)
    time.sleep(3)
    os.makedirs(os.path.dirname(os.path.abspath(screenshot)), exist_ok=True)
    capture_screenshot_with_timeout_retry(device_id, screenshot)
    if not os.path.isfile(screenshot):
        raise SmokeFailure("simctl screenshot reported success but did not create an image")
    print("Native iOS app installed, launched, received a deep link, and captured a screenshot.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", required=True)
    parser.add_argument("--screenshot", required=True)
    args = parser.parse_args()
    try:
        smoke(args.app, args.screenshot)
    except SmokeFailure as error:
        print(f"::error::MOVO iOS simulator smoke failed: {error}", file=sys.stderr)
        # A failed screenshot is still a failure; no step is marked successful.
        try:
            diagnostic = run_command(["xcrun", "simctl", "list", "devices"], 20)
            print("CoreSimulator devices at failure:\n" + diagnostic[-2500:], file=sys.stderr)
        except SmokeFailure as diagnostic_error:
            print(f"CoreSimulator diagnostic unavailable: {diagnostic_error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
