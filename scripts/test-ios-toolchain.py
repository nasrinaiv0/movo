#!/usr/bin/env python3
"""Toolchain selection tests; these do not execute Xcode or certify a device."""
import importlib.util
import io
import os
from pathlib import Path
import plistlib
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location("toolchain", Path(__file__).with_name("select-ios-toolchain.py"))
toolchain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(toolchain)


class ToolchainTests(unittest.TestCase):
    def test_stable_version_rejects_beta_and_malformed_versions(self):
        self.assertEqual((27, 1, 0), toolchain.stable_version("27.1"))
        self.assertEqual((26, 6, 1), toolchain.stable_version("26.6.1"))
        for value in (None, "", "27.1 beta", "27.1.0.1", "latest"):
            self.assertIsNone(toolchain.stable_version(value))

    def execute(self, require_duo=False, versions=None):
        versions = versions or {"/Applications/Xcode_26.6.app": "26.6", "/Applications/Xcode_27.1.app": "27.1", "/Applications/Xcode_28_beta.app": "28.0"}
        def read(path, mode):
            app = path.split("/Contents/")[0]
            return io.BytesIO(plistlib.dumps({"CFBundleShortVersionString": versions[app]}))
        with mock.patch.object(toolchain.glob, "glob", return_value=list(versions)), \
                mock.patch("builtins.open", side_effect=read), \
                mock.patch.dict(os.environ, {"GITHUB_ENV": "", "GITHUB_STEP_SUMMARY": ""}), \
                mock.patch("sys.argv", ["select-ios-toolchain.py"] + (["--require-duo"] if require_duo else [])), \
                mock.patch.object(toolchain.subprocess, "run") as run:
            toolchain.main()
            return run.call_args_list

    def test_selects_newest_stable_without_using_beta(self):
        calls = self.execute()
        self.assertEqual("/Applications/Xcode_27.1.app/Contents/Developer", calls[0].kwargs["env"]["DEVELOPER_DIR"])
        self.assertEqual(["xcrun", "--sdk", "iphoneos", "--show-sdk-version"], calls[1].args[0])

    def test_duo_requirement_rejects_old_sdk_instead_of_substituting(self):
        with self.assertRaisesRegex(SystemExit, "requires Xcode 27.1"):
            self.execute(True, {"/Applications/Xcode_26.6.app": "26.6"})

    def test_duo_requirement_accepts_qualifying_stable_toolchain(self):
        self.assertEqual(2, len(self.execute(True)))


if __name__ == "__main__":
    unittest.main()
