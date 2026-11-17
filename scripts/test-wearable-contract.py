"""Fast fail-closed static wearable contract checks; run from repository root."""
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
ANDROID = "{http://schemas.android.com/apk/res/android}"

def check(condition, message):
    if not condition:
        raise AssertionError(message)

def contents(path):
    return (ROOT / path).read_text(encoding="utf-8")

def main():
    wear = ET.fromstring(contents("android/wear/src/main/AndroidManifest.xml"))
    phone = ET.fromstring(contents("android/app/src/main/AndroidManifest.xml"))
    features = wear.findall("uses-feature")
    check(any(f.get(ANDROID+"name") == "android.hardware.type.watch" and f.get(ANDROID+"required") == "true" for f in features),
          "Wear OS must target watches only")
    app = wear.find("application")
    check(app is not None and app.get(ANDROID+"allowBackup") == "false", "Wear backup must be disabled")
    check(app.find("meta-data").get(ANDROID+"value") == "false", "Wear app must depend on phone")
    check(not wear.findall("uses-permission"), "Wear app must not collect permissions")
    check(not any(f.get(ANDROID+"name") == "android.hardware.type.watch" for f in phone.findall("uses-feature")),
          "Phone AAB must not become watch-targeted")
    phone_intents = phone.findall(".//intent-filter")
    check(any(any(x.get(ANDROID+"host") == "wear-log" for x in flt.findall("data")) for flt in phone_intents),
          "Phone must allowlist the wear-log handoff")
    wear_source = contents("android/wear/src/main/java/com/nasrinai/movo/wear/WearActivity.java")
    check('Uri.parse("movo://wear-log")' in wear_source, "Wear OS handoff must be fixed URI")
    check("RemoteActivityHelper" in wear_source, "Wear OS must request phone handoff, not direct ledger writes")
    for banned in ("supabase", "access_token", "refresh_token", "account_id", "transaction_id"):
        check(banned not in wear_source.lower(), "Wear app contains forbidden data access: "+banned)
    apple = contents("ios/App/MOVOWatch/MOVOWatchApp.swift")
    check('sendMessage(["action": "quickLog"]' in apple, "Apple Watch must send only fixed action")
    check("WCSession.default.isReachable" in apple, "Apple Watch must fail safely when phone unavailable")
    check("MOVOWatch" in contents("ios/App/App.xcodeproj/project.pbxproj"), "Watch target missing")
    native = contents("src/lib/native.js")
    check("wear-log" in native and "consumeWearRequest" in native, "Phone native request handlers missing")
    check("wearLogRequested" in contents("src/App.js"), "Phone app should gate wearable requests")
    print("Wearable companion static contract: PASS (12 checks)")

if __name__ == "__main__":
    try:
        main()
    except (AssertionError, ValueError, OSError, ET.ParseError) as exc:
        print(f"Wearable companion static contract: FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
