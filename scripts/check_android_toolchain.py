"""Fail closed on drift of the approved Android toolchain (no downloads)."""
from hashlib import sha256
from pathlib import Path
import re

AGP = "9.5.1"
GRADLE = "9.6.1"
DIST_SHA = "61ba77b3ff7167e60962763eb4bae79db7120c189b9544358d0ade3c1e712a83"
JAR_SHA = "497c8c2a7e5031f6aa847f88104aa80a93532ec32ee17bdb8d1d2f67a194a9c7"
DIST_URL = r"https\://services.gradle.org/distributions/gradle-9.6.1-all.zip"


def validate(build, properties, jar_digest):
    if re.findall(r"classpath\s+['\"]com\.android\.tools\.build:gradle:([^'\"]+)['\"]", build) != [AGP]:
        raise ValueError("AGP pin missing, ambiguous or changed")
    parsed = {}
    for line in properties.splitlines():
        if not line.strip() or line.lstrip().startswith(('#', '!')):
            continue
        key, sep, value = line.partition('=')
        if not sep or key.strip() in parsed:
            raise ValueError("Invalid or duplicate wrapper property")
        parsed[key.strip()] = value.strip()
    for key, expected in {"distributionUrl": DIST_URL, "distributionSha256Sum": DIST_SHA, "validateDistributionUrl": "true"}.items():
        if parsed.get(key) != expected:
            raise ValueError("Unexpected wrapper property: " + key)
    if jar_digest != JAR_SHA:
        raise ValueError("Unexpected wrapper JAR SHA-256")


def main():
    android = Path(__file__).resolve().parents[1] / 'android'
    wrapper = android / 'gradle' / 'wrapper'
    validate((android / 'build.gradle').read_text(), (wrapper / 'gradle-wrapper.properties').read_text(), sha256((wrapper / 'gradle-wrapper.jar').read_bytes()).hexdigest())
    print(f"Verified pinned AGP {AGP}, Gradle {GRADLE}, distribution checksum and wrapper JAR")


if __name__ == '__main__':
    main()
