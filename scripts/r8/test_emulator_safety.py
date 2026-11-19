import tempfile
import subprocess
from pathlib import Path
import unittest
from unittest.mock import patch
import emulator_smoke as smoke


class EmulatorSafetyTests(unittest.TestCase):
    def tearDown(self):
        smoke.ADB_SERIAL = None

    def test_without_opt_in_never_contacts_adb(self):
        with patch.object(smoke, 'adb') as adb, self.assertRaises(RuntimeError):
            smoke.require_disposable_emulator(False)
        adb.assert_not_called()

    def test_physical_multiple_offline_and_empty_targets_fail_before_mutation(self):
        for targets in ('phone123\tdevice', 'emulator-5554\tdevice\nphone123\tdevice',
                        'emulator-5554\toffline', ''):
            with self.subTest(targets=targets), patch.object(smoke, 'adb', return_value='List of devices attached\n' + targets) as adb:
                with self.assertRaises(RuntimeError):
                    smoke.require_disposable_emulator(True)
                self.assertEqual(adb.call_args_list[0].args, ('devices',))
                self.assertEqual(adb.call_count, 1)

    def test_serial_alone_is_insufficient_proof(self):
        with patch.object(smoke, 'adb', side_effect=['List of devices attached\nemulator-5554\tdevice\n', '0\n']) as adb:
            with self.assertRaises(RuntimeError):
                smoke.require_disposable_emulator(True)
            self.assertEqual(adb.call_count, 2)
        self.assertIsNone(smoke.ADB_SERIAL)

    def test_verified_single_emulator_is_pinned(self):
        with patch.object(smoke, 'adb', side_effect=['List of devices attached\nemulator-5554\tdevice\n', '1\n']):
            self.assertEqual(smoke.require_disposable_emulator(True), 'emulator-5554')
        with patch.object(smoke.subprocess, 'run') as run:
            run.return_value.returncode = 0
            run.return_value.stdout = ''
            smoke.adb('shell', 'true')
            self.assertEqual(run.call_args.args[0], ['adb', '-s', 'emulator-5554', 'shell', 'true'])

    def test_only_matching_explicit_framework_success_counts(self):
        legal = {'date': '2026-11-19', 'revision': ''}
        passed = 'INSTRUMENTATION_RESULT: stream=\nMOVO_R8_SMOKE_PASS testMethod\nINSTRUMENTATION_CODE: -1\n'
        with tempfile.TemporaryDirectory() as folder, patch.object(smoke, 'adb', return_value=passed):
            smoke.instrument(Path(folder), 'testMethod', legal)
        rejected = (
            'INSTRUMENTATION_CODE: -1\n',
            passed.replace('testMethod', 'otherMethod'),
            passed.replace('CODE: -1', 'CODE: 0'),
            passed + 'INSTRUMENTATION_RESULT: shortMsg=Process crashed.\n',
            passed + 'MOVO_R8_SMOKE_PASS testMethod\n',
        )
        for output in rejected:
            with self.subTest(output=output), tempfile.TemporaryDirectory() as folder:
                with patch.object(smoke, 'adb', side_effect=[output, '']), self.assertRaises(RuntimeError):
                    smoke.instrument(Path(folder), 'testMethod', legal)

    def test_adb_deadline_is_a_hard_failure_even_for_best_effort_command(self):
        with patch.object(smoke.subprocess, 'run', side_effect=subprocess.TimeoutExpired(['adb'], 90)) as run:
            with self.assertRaises(subprocess.TimeoutExpired):
                smoke.adb('shell', 'true', check=False)
            self.assertEqual(run.call_args.kwargs['timeout'], 90)

    def test_partial_success_marker_cannot_turn_timeout_into_acceptance(self):
        timeout = subprocess.TimeoutExpired(['adb'], 240, output=b'MOVO_R8_SMOKE_PASS testMethod\n')
        with tempfile.TemporaryDirectory() as directory, patch.object(smoke, 'adb', side_effect=timeout) as adb:
            folder = Path(directory)
            with self.assertRaises(subprocess.TimeoutExpired):
                smoke.instrument(folder, 'testMethod', {'date': '2026-11-19', 'revision': ''})
            self.assertIn('acceptance FAILED', (folder / 'testMethod.txt').read_text())
            self.assertIn('MOVO_R8_SMOKE_PASS', (folder / 'testMethod.txt').read_text())
            self.assertEqual(adb.call_args.kwargs['timeout'], 240)

    def test_stalled_diagnostics_do_not_prevent_remaining_evidence(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(smoke, 'adb') as adb, patch.object(smoke.subprocess, 'run') as run:
            folder = Path(directory)
            adb.side_effect = [subprocess.TimeoutExpired(['adb', 'logcat'], 30), 'activity evidence', 'pulled screenshots']
            run.side_effect = subprocess.TimeoutExpired(['adb', 'screencap'], 30)
            smoke.capture(folder)
            self.assertEqual((folder / 'activity.txt').read_text(), 'activity evidence')
            self.assertEqual(adb.call_count, 3)
            self.assertEqual(adb.call_args.args[0], 'pull')
            self.assertIn('logcat:', (folder / 'diagnostic-errors.txt').read_text())
            self.assertIn('screenshot:', (folder / 'diagnostic-errors.txt').read_text())


if __name__ == '__main__':
    unittest.main()
