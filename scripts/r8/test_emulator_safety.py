import tempfile
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

    def test_assumption_failure_cannot_be_reported_as_pass(self):
        for code in (-1, -2, -3, -4):
            output = f'INSTRUMENTATION_STATUS_CODE: {code}\nOK (1 test)\n'
            with self.subTest(code=code), tempfile.TemporaryDirectory() as folder, patch.object(smoke, 'adb', return_value=output):
                with self.assertRaises(RuntimeError):
                    smoke.instrument(Path(folder), 'testMethod', {'date': '2026-11-19', 'revision': ''})


if __name__ == '__main__':
    unittest.main()
