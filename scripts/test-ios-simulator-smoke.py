#!/usr/bin/env python3
"""Host-independent tests of macOS CI smoke orchestration; do not claim native smoke."""
import importlib.util
import pathlib
import unittest
from unittest import mock


SOURCE = pathlib.Path(__file__).with_name("ios-simulator-smoke.py")
spec = importlib.util.spec_from_file_location("ios_simulator_smoke", SOURCE)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class IosSimulatorSmokeTests(unittest.TestCase):
    def test_prefers_booted_iphone(self):
        devices = {
            "devices": {
                "iOS 26.5": [
                    {"name": "iPhone 17", "udid": "cold", "isAvailable": True, "state": "Shutdown"},
                    {"name": "iPhone 16", "udid": "warm", "isAvailable": True, "state": "Booted"},
                    {"name": "iPad", "udid": "tablet", "isAvailable": True, "state": "Booted"},
                ]
            }
        }
        import json
        self.assertEqual("warm", smoke.choose_iphone(json.dumps(devices))["udid"])

    def test_prefers_newest_ios_runtime_over_booted_older_one(self):
        devices = {"devices": {
            "com.apple.CoreSimulator.SimRuntime.iOS-26-2": [
                {"name": "iPhone 17", "udid": "old", "isAvailable": True, "state": "Booted"}
            ],
            "com.apple.CoreSimulator.SimRuntime.iOS-26-5": [
                {"name": "iPhone 17 Pro", "udid": "new", "isAvailable": True, "state": "Shutdown"}
            ],
        }}
        import json
        selected = smoke.choose_iphone(json.dumps(devices))
        self.assertEqual("new", selected["udid"])
        self.assertEqual((26, 5), selected["_version"])

    def test_prefers_booted_iphone_within_newest_runtime(self):
        devices = {"devices": {
            "iOS 26.5": [
                {"name": "iPhone 17", "udid": "cold", "isAvailable": True, "state": "Shutdown"},
                {"name": "iPhone 16", "udid": "warm", "isAvailable": True, "state": "Booted"},
            ]
        }}
        import json
        self.assertEqual("warm", smoke.choose_iphone(json.dumps(devices))["udid"])

    def test_rejects_missing_iphone(self):
        with self.assertRaisesRegex(smoke.SmokeFailure, "No available iPhone"):
            smoke.choose_iphone('{"devices":{"iOS":[]}}')

    def test_rejects_bad_device_json(self):
        with self.assertRaisesRegex(smoke.SmokeFailure, "Could not parse"):
            smoke.choose_iphone("not json")

    def test_retries_only_transient_launch_timeout(self):
        runner = mock.Mock(side_effect=[smoke.SmokeFailure("slow", timed_out=True), None])
        sleeper = mock.Mock()
        smoke.launch_with_cold_boot_retry("device1", runner=runner, sleeper=sleeper)
        self.assertEqual(2, runner.call_count)
        self.assertEqual(180, runner.call_args.kwargs["timeout"])
        sleeper.assert_called_once_with(15)

    def test_real_launch_error_fails_immediately(self):
        runner = mock.Mock(side_effect=smoke.SmokeFailure("app rejected launch"))
        with self.assertRaisesRegex(smoke.SmokeFailure, "app rejected"):
            smoke.launch_with_cold_boot_retry("device1", runner=runner, sleeper=mock.Mock())
        runner.assert_called_once()

    def test_second_timeout_remains_failure(self):
        runner = mock.Mock(side_effect=smoke.SmokeFailure("slow", timed_out=True))
        with self.assertRaisesRegex(smoke.SmokeFailure, "slow"):
            smoke.launch_with_cold_boot_retry("device1", runner=runner, sleeper=mock.Mock())
        self.assertEqual(2, runner.call_count)

    def test_screenshot_timeout_retries_once(self):
        runner = mock.Mock(side_effect=[smoke.SmokeFailure("slow screenshot", timed_out=True), None])
        sleeper = mock.Mock()
        smoke.capture_screenshot_with_timeout_retry("device1", "/tmp/test.png",
                                                    runner=runner, sleeper=sleeper)
        self.assertEqual(2, runner.call_count)
        self.assertEqual(90, runner.call_args.kwargs["timeout"])
        sleeper.assert_called_once_with(15)

    def test_screenshot_second_timeout_fails_ci(self):
        runner = mock.Mock(side_effect=smoke.SmokeFailure("still stuck", timed_out=True))
        with self.assertRaisesRegex(smoke.SmokeFailure, "still stuck"):
            smoke.capture_screenshot_with_timeout_retry("device1", "/tmp/test.png",
                                                        runner=runner, sleeper=mock.Mock())
        self.assertEqual(2, runner.call_count)

    def test_screenshot_non_timeout_fails_immediately(self):
        runner = mock.Mock(side_effect=smoke.SmokeFailure("device rejected screenshot"))
        with self.assertRaisesRegex(smoke.SmokeFailure, "device rejected screenshot"):
            smoke.capture_screenshot_with_timeout_retry("device1", "/tmp/test.png",
                                                        runner=runner, sleeper=mock.Mock())
        runner.assert_called_once()

    def test_subprocess_timeout_is_not_success(self):
        with mock.patch.object(smoke.subprocess, "run", side_effect=subprocess_timeout()):
            with self.assertRaises(smoke.SmokeFailure) as caught:
                smoke.run_command(["xcrun", "simctl", "launch"], timeout=5)
        self.assertTrue(caught.exception.timed_out)

    def test_subprocess_nonzero_is_not_retryable_timeout(self):
        result = mock.Mock(returncode=1, stdout="", stderr="launch failed")
        with mock.patch.object(smoke.subprocess, "run", return_value=result):
            with self.assertRaisesRegex(smoke.SmokeFailure, "launch failed") as caught:
                smoke.run_command(["xcrun", "simctl", "launch"], timeout=5)
        self.assertFalse(caught.exception.timed_out)


def subprocess_timeout():
    import subprocess
    return subprocess.TimeoutExpired(["xcrun"], 5)


if __name__ == "__main__":
    unittest.main()
