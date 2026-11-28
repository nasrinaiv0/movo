import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock
from ios_failure_diagnostics import COMMANDS, LIMIT, collect

class DiagnosticsTests(unittest.TestCase):
    def test_timeout_and_failure_preserve_remaining_evidence(self):
        results = [subprocess.TimeoutExpired(['xcrun'], 20, output=b'partial'), OSError('missing'), subprocess.CompletedProcess([], 2, 'disk', 'err'), subprocess.CompletedProcess([], 0, 'x'*(LIMIT+4), ''), subprocess.CompletedProcess([], 0, 'launch', '')]
        runner = Mock(side_effect=results)
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)/'evidence'
            rows = collect(out, runner)
            self.assertEqual(len(rows), len(COMMANDS))
            self.assertEqual(rows[0]['timeout'], 20)
            self.assertEqual(rows[1]['error'], 'OSError')
            self.assertEqual(rows[2]['exit_code'], 2)
            self.assertTrue(rows[3]['truncated'])
            self.assertIn('partial', (out/'devices.txt').read_text())
            self.assertIn('launch', (out/'launch.txt').read_text())
            self.assertTrue(json.loads((out/'manifest.json').read_text())['diagnostic_only'])
            self.assertEqual(runner.call_count, 5)
    def test_refuses_stale_output_directory(self):
        runner=Mock()
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(FileExistsError): collect(Path(d), runner)
        runner.assert_not_called()

if __name__ == '__main__': unittest.main()
