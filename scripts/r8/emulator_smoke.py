#!/usr/bin/env python3
"""Hard-failing minified-release instrumentation on a network-isolated disposable AVD."""
import argparse
from contextlib import contextmanager
from datetime import date
import json
from pathlib import Path
import re
import subprocess
import sys

# The shared host-only evidence helper is in the parent scripts directory.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from native_evidence import EvidenceError, require_r8_capture

PACKAGE = "com.nasrinai.movo"
TEST_PACKAGE = PACKAGE + ".test"
CLASS = PACKAGE + ".r8.ReleaseBridgeSmokeTest"
RUNNER = TEST_PACKAGE + "/" + CLASS
PIXEL_LAUNCHER = "com.google.android.apps.nexuslauncher"
ADB_SERIAL = None


def legal_fixture(source):
    """Read acceptance markers from the checked-out app, without executing JS."""
    dates = []
    for name in ("TERMS_EFFECTIVE_DATE", "PRIVACY_EFFECTIVE_DATE"):
        match = re.search(r"^export const " + name + r"\s*=\s*(['\"])(\d{4}-\d{2}-\d{2})T[^'\"]+\1\s*;", source, re.M)
        if not match:
            raise ValueError("Cannot derive synthetic legal fixture: " + name)
        dates.append(date.fromisoformat(match.group(2)).isoformat())
    accepted = max(dates)
    literal = re.search(r"^export const LEGAL_VERSION\s*=\s*(['\"])([^'\"]+)\1\s*;", source, re.M)
    revision = ""
    if literal:
        version = literal.group(2)
        if re.fullmatch(re.escape(accepted) + r"-r[1-9]\d*", version):
            revision = version
        elif version != accepted:
            raise ValueError("Legal revision does not match effective dates")
    elif not re.search(r"^export const LEGAL_VERSION\s*=\s*\[TERMS_EFFECTIVE_DATE,\s*PRIVACY_EFFECTIVE_DATE\]", source, re.M):
        raise ValueError("Unsupported legal-version fixture expression")
    return {"date": accepted, "revision": revision}


def adb(*args, check=True, timeout=90):
    prefix = ["adb", "-s", ADB_SERIAL] if ADB_SERIAL else ["adb"]
    result = subprocess.run([*prefix, *args], text=True, capture_output=True, timeout=timeout)
    if check and result.returncode:
        print(result.stdout + result.stderr, file=sys.stderr)
        raise subprocess.CalledProcessError(result.returncode, result.args, output=result.stdout, stderr=result.stderr)
    return result.stdout


def require_disposable_emulator(opt_in):
    """Refuse real/ambiguous ADB devices before root, firewall or uninstall."""
    global ADB_SERIAL
    if not opt_in:
        raise RuntimeError("Explicit --disposable-emulator opt-in is required")
    lines = adb("devices").splitlines()[1:]
    devices = [line.split() for line in lines if line.strip()]
    if len(devices) != 1 or len(devices[0]) != 2:
        raise RuntimeError("Require exactly one connected disposable emulator")
    serial, state = devices[0]
    if not re.fullmatch(r"emulator-\d+", serial) or state != "device":
        raise RuntimeError("Refuse non-emulator, offline or unauthorized ADB target")
    ADB_SERIAL = serial
    if adb("shell", "getprop", "ro.kernel.qemu").strip() != "1":
        ADB_SERIAL = None
        raise RuntimeError("ADB target did not prove it is an emulator")
    return serial


def establish_emulator_root():
    """Recover bounded ADB restart disconnects without accepting an unverified target."""
    if not ADB_SERIAL or not re.fullmatch(r"emulator-\d+", ADB_SERIAL):
        raise RuntimeError("Require the verified disposable emulator before requesting root")
    for attempt in range(3):
        try:
            if adb("shell", "getprop", "ro.kernel.qemu").strip() != "1":
                raise RuntimeError("Reconnected ADB target did not prove it is an emulator")
            adb("root")
            adb("wait-for-device", timeout=30)
            if adb("shell", "getprop", "ro.kernel.qemu").strip() != "1":
                raise RuntimeError("Rooted ADB target did not prove it is an emulator")
            if adb("shell", "id", "-u").strip() != "0":
                raise RuntimeError("Emulator root was not established; refuse firewall or package changes")
            return
        except subprocess.CalledProcessError as error:
            diagnostic = (error.output or "") + (error.stderr or "")
            if attempt == 2 or not re.search(r"(?:unable to connect for root: closed|device offline|error: closed)", diagnostic):
                raise
            print("ADB transport restarted; reconnecting the same verified emulator.", flush=True)
            adb("wait-for-device", timeout=30)
    raise RuntimeError("Emulator root was not established")


def disable_pixel_launcher():
    """Keep a background launcher ANR from covering the app under test."""
    if not ADB_SERIAL:
        raise RuntimeError("Require the verified disposable emulator before changing its launcher")
    package = "package:" + PIXEL_LAUNCHER
    installed = adb("shell", "pm", "list", "packages", "--user", "0", PIXEL_LAUNCHER)
    if package not in installed.splitlines():
        return
    adb("shell", "pm", "disable-user", "--user", "0", PIXEL_LAUNCHER)
    adb("shell", "am", "force-stop", "--user", "0", PIXEL_LAUNCHER)
    disabled = adb("shell", "pm", "list", "packages", "-d", "--user", "0", PIXEL_LAUNCHER)
    if package not in disabled.splitlines():
        raise RuntimeError("Could not isolate the Pixel Launcher on the disposable emulator")
    print("Disabled the Pixel Launcher on the disposable emulator.", flush=True)


def instrument(folder, method, legal, phase=None):
    label = phase or method
    args = ["shell", "am", "instrument", "-w", "-r", "-e", "movoR8Smoke", "true", "-e", "movoTest", method]
    args.extend(["-e", "movoLegalDate", legal["date"]])
    args.extend(["-e", "movoExpectEncryptedFinance", "true" if legal.get("encryptedFinance") else "false"])
    if legal["revision"]:
        args.extend(["-e", "movoLegalRevision", legal["revision"]])
    if phase:
        args.extend(["-e", "movoPersistencePhase", phase])
    print("Starting instrumentation: " + label, flush=True)
    try:
        result = adb(*args, RUNNER, timeout=240)
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError) as error:
        # A disconnected emulator may disappear before end-of-run capture. Keep
        # the failed stage's stdout AND stderr while retaining the original error.
        def evidence_text(value):
            return value.decode("utf-8", errors="replace") if isinstance(value, bytes) else value or ""
        status = ("timed out" if isinstance(error, subprocess.TimeoutExpired)
                  else "exited with status " + str(error.returncode))
        try:
            (folder / (label + ".txt")).write_text(
                evidence_text(error.stdout)[-262144:] + "\n--- stderr ---\n" +
                evidence_text(error.stderr)[-262144:] +
                "\nInstrumentation " + status + "; acceptance FAILED.\n", encoding="utf-8")
        except OSError as diagnostic_error:
            print(f"Failed to retain instrumentation transcript: {diagnostic_error}", file=sys.stderr)
        raise
    (folder / (label + ".txt")).write_text(result)
    print(result, flush=True)
    # adb can exit zero even when instrumentation never ran or failed.
    markers = re.findall(r"(?m)^MOVO_R8_SMOKE_PASS (\S+)[ \t]*\r?$", result)
    codes = re.findall(r"(?m)^INSTRUMENTATION_CODE:[ \t]*(-?\d+)[ \t]*\r?$", result)
    if markers != [label] or codes != ["-1"] or re.search(r"INSTRUMENTATION_FAILED|Process crashed|shortMsg=", result):
        crash_log = adb("logcat", "-b", "crash", "-d", check=False)
        if crash_log:
            print(crash_log[-8000:], file=sys.stderr, flush=True)
        raise RuntimeError("Instrumentation failed or skipped: " + label)


def capture(folder):
    errors = []
    def collect(name, action):
        try:
            action()
        except (OSError, subprocess.SubprocessError) as error:
            errors.append(name + ": " + str(error))
    collect("logcat", lambda: (folder / "logcat.txt").write_text(
        adb("logcat", "-d", "-v", "threadtime", timeout=30)))
    def screen():
        with (folder / "screen.png").open("wb") as image:
            subprocess.run(["adb", "-s", ADB_SERIAL, "exec-out", "screencap", "-p"],
                           stdout=image, check=True, timeout=30)
    collect("screenshot", screen)
    collect("activity", lambda: (folder / "activity.txt").write_text(
        adb("shell", "dumpsys", "activity", "activities", timeout=30)))
    collect("screenshots", lambda: adb("pull", "/sdcard/Android/data/" + PACKAGE + "/files/r8-smoke",
                                      str(folder / "screenshots"), timeout=30))
    if errors:
        (folder / "diagnostic-errors.txt").write_text("\n".join(errors) + "\n")
        raise EvidenceError("Android diagnostic capture failed: " + "; ".join(errors))
    require_r8_capture(folder)


@contextmanager
def stream_device_log(folder):
    """Keep pre-failure evidence when a disposable emulator vanishes entirely."""
    if not ADB_SERIAL:
        raise RuntimeError("Require the verified disposable emulator before recording logs")
    with (folder / "live-logcat.txt").open("w") as log:
        recorder = subprocess.Popen(["adb", "-s", ADB_SERIAL, "logcat", "-v", "threadtime"],
                                    stdout=log, stderr=subprocess.STDOUT, text=True)
        try:
            yield
        finally:
            if recorder.poll() is None:
                recorder.terminate()
                try:
                    recorder.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    recorder.kill()
                    recorder.wait(timeout=5)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--disposable-emulator", action="store_true", help="Permit deleting only synthetic data on a verified emulator")
    parser.add_argument("--variant", choices=("baseline", "candidate"),
                        help="Run one compiler output on its own fresh disposable AVD; default runs both")
    args = parser.parse_args()
    require_disposable_emulator(args.disposable_emulator)
    output = args.output.resolve()
    legal = legal_fixture((Path(__file__).resolve().parents[2] / "src/lib/legalVersion.js").read_text())
    (output / "legal-fixture.json").write_text(json.dumps(legal, indent=2) + "\n")
    establish_emulator_root()
    disable_pixel_launcher()
    # google_apis (not Play Store) images support root. Fail if network isolation
    # cannot be established. ADB uses the emulator transport, not Android OUTPUT.
    adb("shell", "svc", "wifi", "disable")
    adb("shell", "svc", "data", "disable")
    adb("shell", "cmd", "connectivity", "airplane-mode", "enable")
    for tool in ("iptables", "ip6tables"):
        adb("shell", tool, "-I", "OUTPUT", "1", "-j", "DROP")
        adb("shell", tool, "-C", "OUTPUT", "-j", "DROP")
    # Both variants compile this same app source; only their R8 rules differ.
    # Require the same financial storage representation in both compiler outputs.
    fixture = {**legal, "encryptedFinance":
               (Path(__file__).resolve().parents[2] / "src/lib/financeVault.js").is_file()}
    for label in ((args.variant,) if args.variant else ("baseline", "candidate")):
        print("Starting minified release acceptance: " + label, flush=True)
        built = output / "default" / label
        folder = built / "device"
        # Refuse reused evidence directories, including stale passed.txt markers.
        folder.mkdir(parents=True, exist_ok=False)
        with stream_device_log(folder):
            try:
                adb("uninstall", TEST_PACKAGE, check=False)
                adb("uninstall", PACKAGE, check=False)
                adb("install", "-r", str(built / "app-release.apk"))
                adb("install", "-r", "-t", str(built / "app-release-androidTest.apk"))
                adb("logcat", "-c")
                # Seed native Preferences before any WebView/React state can write
                # defaults over an out-of-band fixture. The first real startup must
                # restore it through the production Preferences bridge.
                instrument(folder, "seedOfflineWallet", fixture)
                adb("shell", "am", "force-stop", PACKAGE)
                cold = adb("shell", "am", "start", "-S", "-W", "-n", PACKAGE + "/.MainActivity")
                (folder / "cold-launch.txt").write_text(cold)
                if "Status: ok" not in cold:
                    raise RuntimeError("Cold launch failed")
                for method in ("bridgeVaultPersistsAcrossActivityRecreation",
                               "offlineWalletLogoStyleAndSyntheticOAuthCallback"):
                    adb("shell", "am", "force-stop", PACKAGE)
                    instrument(folder, method, fixture)
                adb("shell", "am", "force-stop", PACKAGE)
                instrument(folder, "processPersistencePhase", fixture, "seed")
                adb("shell", "am", "force-stop", PACKAGE)
                # Do not clear/uninstall between these phases: same Keystore+storage.
                instrument(folder, "processPersistencePhase", fixture, "verify")
            except BaseException:
                # Best-effort capture must never hide the original failure.
                try:
                    capture(folder)
                except Exception as diagnostic_error:
                    print(f"Evidence capture also failed: {diagnostic_error}", file=sys.stderr)
                raise
            else:
                capture(folder)
        # Publish the success marker only after required evidence and log cleanup.
        (folder / "passed.txt").write_text("Synthetic bridge/offline/native callback and separate-process vault checks passed.\nReal Google/email sign-in and signed store purchases were NOT tested.\n")


if __name__ == "__main__":
    main()
