import json
from pathlib import Path
import struct
import tempfile
import unittest
import zipfile
from metrics import artifact, compare


class MetricsTests(unittest.TestCase):
    def test_reads_actual_dex_header_and_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "synthetic.apk"
            dex = bytearray(112)
            dex[:8] = b"dex\n035\0"
            for offset, value in ((32, 112), (80, 2), (88, 3), (96, 1)):
                struct.pack_into("<I", dex, offset, value)
            with zipfile.ZipFile(target, "w") as archive:
                archive.writestr("classes.dex", dex)
            result = artifact(target)
            self.assertEqual(result["dex_bytes"], 112)
            self.assertEqual(result["dex"][0]["method_references"], 3)
            self.assertEqual(result["dex"][0]["class_definitions"], 1)

    def test_rejects_missing_dex(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "synthetic.apk"
            with zipfile.ZipFile(target, "w") as archive:
                archive.writestr("not-dex.txt", "fixture")
            with self.assertRaises(ValueError):
                artifact(target)

    def test_never_compares_different_compilers_as_rule_gains(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for label, version in (("baseline", "8.13.17"), ("candidate", "9.4.34")):
                folder = root / "default" / label
                folder.mkdir(parents=True)
                (folder / "metrics.json").write_text(json.dumps({"r8_version": version, "source_sha": "fixture"}))
            with self.assertRaises(ValueError):
                compare(root, "default")


if __name__ == "__main__":
    unittest.main()
