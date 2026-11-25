"""Verify real production-harness failure handling with synthetic ADB outcomes."""
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import emulator_smoke as smoke

class InstrumentationFailureEvidence(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.legal = {"date": "2026-11-20", "revision": "2026-11-20-r1", "encryptedFinance": True}

    def invoke(self, error):
        with patch.object(smoke, "adb", side_effect=error):
            with self.assertRaises(type(error)) as caught:
                smoke.instrument(self.folder, "offlineWalletLogoStyleAndSyntheticOAuthCallback", self.legal)
        self.assertIs(caught.exception, error)
        self.assertFalse((self.folder / "passed.txt").exists())
        return (self.folder / "offlineWalletLogoStyleAndSyntheticOAuthCallback.txt").read_text()

    def test_disconnect_retains_both_streams_and_original_error(self):
        output = self.invoke(subprocess.CalledProcessError(255, ["adb"], output="partial stage", stderr="device not found"))
        self.assertIn("partial stage", output)
        self.assertIn("device not found", output)
        self.assertIn("exited with status 255; acceptance FAILED", output)

    def test_timeout_retains_binary_streams(self):
        output = self.invoke(subprocess.TimeoutExpired(["adb"], 240, output=b"partial\xff", stderr=b"timeout"))
        self.assertIn("partial", output)
        self.assertIn("timeout", output)
        self.assertIn("timed out; acceptance FAILED", output)

    def test_transcript_write_failure_does_not_mask_original(self):
        error = subprocess.CalledProcessError(255, ["adb"], output="x", stderr="y")
        with patch.object(smoke, "adb", side_effect=error), patch.object(Path, "write_text", side_effect=OSError("disk full")):
            with self.assertRaises(subprocess.CalledProcessError) as caught:
                smoke.instrument(self.folder, "offlineWalletLogoStyleAndSyntheticOAuthCallback", self.legal)
        self.assertIs(caught.exception, error)
        self.assertFalse((self.folder / "passed.txt").exists())

    def test_failure_streams_are_bounded(self):
        output = self.invoke(subprocess.CalledProcessError(255, ["adb"], output="a"*300000, stderr="b"*300000))
        self.assertLess(len(output), 525000)
        self.assertIn("acceptance FAILED", output)

    def test_valid_pass_contract_remains(self):
        label = "seedOfflineWallet"
        result = "MOVO_R8_SMOKE_PASS " + label + "\nINSTRUMENTATION_CODE: -1\n"
        with patch.object(smoke, "adb", return_value=result):
            smoke.instrument(self.folder, label, self.legal)
        self.assertEqual((self.folder / (label+".txt")).read_text(), result)
        self.assertFalse((self.folder / "passed.txt").exists())
