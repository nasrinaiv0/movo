from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from emulator_smoke import instrument, legal_fixture

DATES = """export const TERMS_EFFECTIVE_DATE = '2026-11-18T00:00:00Z';
export const PRIVACY_EFFECTIVE_DATE = '2026-11-19T00:00:00Z';
"""


class LegalFixtureTests(unittest.TestCase):
    def test_legacy_date_only_uses_later_effective_date(self):
        source = DATES + "export const LEGAL_VERSION = [TERMS_EFFECTIVE_DATE, PRIVACY_EFFECTIVE_DATE].sort().pop().slice(0, 10);"
        self.assertEqual(legal_fixture(source), {"date": "2026-11-19", "revision": ""})

    def test_explicit_revision_preserves_date_separately(self):
        source = DATES + "export const LEGAL_VERSION = '2026-11-19-r2';"
        self.assertEqual(legal_fixture(source), {"date": "2026-11-19", "revision": "2026-11-19-r2"})

    def test_unknown_or_mismatched_revision_fails_closed(self):
        for version in ("2026-11-18-r2", "2026-11-19-r0", "unknown"):
            with self.subTest(version=version), self.assertRaises(ValueError):
                legal_fixture(DATES + "export const LEGAL_VERSION = '" + version + "';")

    def test_missing_effective_date_fails_closed(self):
        with self.assertRaises(ValueError):
            legal_fixture("export const LEGAL_VERSION = '2026-11-19-r2';")

    def test_instrumentation_receives_both_markers(self):
        legal = {"date": "2026-11-19", "revision": "2026-11-19-r2"}
        with tempfile.TemporaryDirectory() as folder, patch("emulator_smoke.adb", return_value="OK (1 test)") as adb:
            instrument(Path(folder), "fixtureMethod", legal)
            args = adb.call_args.args
            self.assertIn("movoLegalDate", args)
            self.assertIn(legal["date"], args)
            self.assertIn("movoLegalRevision", args)
            self.assertIn(legal["revision"], args)


if __name__ == "__main__":
    unittest.main()
