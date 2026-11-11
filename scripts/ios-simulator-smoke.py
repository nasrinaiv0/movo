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


def runtime_version(runtime):
    """CoreSimulator keys are formatted as either 'iOS 26.5' or '...SimRuntime.iOS-26-5'."""
    match = re.search(r'ios(?:[-.\s]+)(\d+)(?:[-.\s]+(\d+))?(?:[-.\s]+(\d+))?', str(runtime), re.I)
    if not match:
        return (0, 0, 0)
    return tuple(int(part or 0) for part in match.groups())


def choose_iphone(simulator_json):
    try:
        data = json.loads(simulator_json)
        phones = [
            (runtime_version(runtime), device)
            for runtime, devices in data["devices"].items()
            for device in devices
            if "iOS" in runtime and device.get("isAvailable") and "iPhone" in device.get("name", "")
            and device.get("udid")
        ]
    except (ValueError, KeyError, TypeError) as error:
        raise SmokeFailure("Could not parse available CoreSimulator devices") from error
    if not phones:
        raise SmokeFailure("No available iPhone Simulator on the macOS runner")
    # A running older OS runtime can hang against the Xcode version selected by CI.
    # Prefer the newest installed iOS runtime; then a booted iPhone in that runtime.
    return sorted(phones, key=lambda entry: (
        tuple(-part for part in entry[0]), entry[1].get("state") != "Booted",
    ))[0][1]


def recover_stalled_simulator(device_id, *, runner=run_command):
    """After OS-service timeout, restart the test device WITHOUT erasing app/user data."""
    runner(["xcrun", "simctl", "shutdown", device_id], timeout=90)
    runner(["xcrun", "simctl", "boot", device_id], timeout=90)
    runner(["xcrun", "simctl", "bootstatus", device_id, "-b"], timeout=600)

def launch_with_cold_boot_retry(device_id, *, runner=run_command, sleeper=time.sleep, recovery=None):
    """Retry ONLY a launch timeout, after restarting the stalled CoreSimulator.

    A real launch exit error or a failed device recovery must fail the job.
    The second timeout must also fail; never claim success without app launch.
    """
    launch = ["xcrun", "simctl", "launch", device_id, BUNDLE_ID]
    for attempt in (1, 2):
        try:
            runner(launch, timeout=180)
            return
        except SmokeFailure as error:
            if not error.timed_out or attempt == 2:
                raise
            print("::warning::CoreSimulator launch timed out; restarting the test "
                  "simulator and waiting for a complete fresh boot before one retry.", flush=True)
            if recovery is None:
                recover_stalled_simulator(device_id, runner=runner)
            else:
                recovery(device_id)
            sleeper(15)
    raise SmokeFailure("Simulator launch did not complete")


def smoke(app, screenshot):
    if not os.path.isdir(app):
        raise SmokeFailure(f"Simulator .app is missing: {app}")
    device = choose_iphone(run_command(["xcrun", "simctl", "list", "devices", "available", "--json"], 30))
    device_id = device["udid"]
    print(f"Simulator selected: {device['name']} ({device_id}), state={device.get('state')}", flush=True)
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
    run_command(["xcrun", "simctl", "io", device_id, "screenshot", screenshot], 90)
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
