import tempfile
from contextlib import nullcontext
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

    def test_launcher_setup_requires_a_verified_emulator(self):
        with patch.object(smoke, 'adb') as adb, self.assertRaises(RuntimeError):
            smoke.disable_pixel_launcher()
        adb.assert_not_called()

    def test_root_requires_a_verified_emulator_and_actual_root_uid(self):
        with patch.object(smoke, 'adb') as adb, self.assertRaises(RuntimeError):
            smoke.establish_emulator_root()
        adb.assert_not_called()
        smoke.ADB_SERIAL = 'emulator-5554'
        with patch.object(smoke, 'adb', side_effect=['1', '', '', '1', '2000']) as adb:
            with self.assertRaisesRegex(RuntimeError, 'root was not established'):
                smoke.establish_emulator_root()
            self.assertEqual(adb.call_count, 5)

    def test_root_recovers_only_a_bounded_transport_disconnect_on_the_pinned_target(self):
        smoke.ADB_SERIAL = 'emulator-5554'
        closed = subprocess.CalledProcessError(1, ['adb', 'root'], stderr='adb: unable to connect for root: closed')
        with patch.object(smoke, 'adb', side_effect=['1', closed, '', '1', '', '', '1', '0']) as adb:
            smoke.establish_emulator_root()
            self.assertEqual(smoke.ADB_SERIAL, 'emulator-5554')
            self.assertEqual(sum(call.args == ('root',) for call in adb.call_args_list), 2)
        with patch.object(smoke, 'adb', side_effect=['1', closed, '', '1', closed, '', '1', closed]) as adb:
            with self.assertRaises(subprocess.CalledProcessError):
                smoke.establish_emulator_root()
            self.assertEqual(sum(call.args == ('root',) for call in adb.call_args_list), 3)

    def test_root_refuses_changed_identity_unknown_failures_and_timeouts(self):
        smoke.ADB_SERIAL = 'emulator-5554'
        failures = [
            (['0'], RuntimeError),
            (['1', '', '', '0'], RuntimeError),
            (['1', subprocess.CalledProcessError(1, ['adb', 'root'], stderr='permission denied')], subprocess.CalledProcessError),
            (['1', subprocess.TimeoutExpired(['adb', 'root'], 90)], subprocess.TimeoutExpired),
        ]
        for responses, error in failures:
            with self.subTest(responses=responses), patch.object(smoke, 'adb', side_effect=responses) as adb:
                with self.assertRaises(error):
                    smoke.establish_emulator_root()
                self.assertEqual(adb.call_count, len(responses))

    def test_launcher_setup_only_disables_pixel_launcher_and_verifies_it(self):
        smoke.ADB_SERIAL = 'emulator-5554'
        launcher = 'com.google.android.apps.nexuslauncher'
        package = 'package:' + launcher + '\n'
        with patch.object(smoke, 'adb', return_value='package:' + launcher + '.other\n') as adb:
            smoke.disable_pixel_launcher()
            adb.assert_called_once_with('shell', 'pm', 'list', 'packages', '--user', '0', launcher)
        with patch.object(smoke, 'adb', side_effect=[package, '', '', package]) as adb:
            smoke.disable_pixel_launcher()
            self.assertEqual([c.args for c in adb.call_args_list], [
                ('shell', 'pm', 'list', 'packages', '--user', '0', launcher),
                ('shell', 'pm', 'disable-user', '--user', '0', launcher),
                ('shell', 'am', 'force-stop', '--user', '0', launcher),
                ('shell', 'pm', 'list', 'packages', '-d', '--user', '0', launcher),
            ])
        with patch.object(smoke, 'adb', side_effect=[package, '', '', '']), self.assertRaises(RuntimeError):
            smoke.disable_pixel_launcher()

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

    def test_each_instrumentation_explicitly_requires_the_selected_finance_format(self):
        passed = 'MOVO_R8_SMOKE_PASS testMethod\nINSTRUMENTATION_CODE: -1\n'
        for encrypted in [True, False]:
            with self.subTest(encrypted=encrypted), tempfile.TemporaryDirectory() as folder:
                with patch.object(smoke, 'adb', return_value=passed) as adb:
                    smoke.instrument(Path(folder), 'testMethod', {'date': '2026-11-20', 'revision': '', 'encryptedFinance': encrypted})
                    args = adb.call_args.args
                    position = args.index('movoExpectEncryptedFinance')
                    self.assertEqual(args[position + 1], 'true' if encrypted else 'false')

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

    def test_live_recording_refuses_unverified_devices_and_preserves_acceptance_failure(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(smoke.subprocess, 'Popen') as popen:
            folder = Path(directory)
            with self.assertRaises(RuntimeError):
                with smoke.stream_device_log(folder):
                    self.fail('unverified target was accepted')
            popen.assert_not_called()
            smoke.ADB_SERIAL = 'emulator-5554'
            recorder = popen.return_value
            recorder.poll.return_value = None
            recorder.wait.side_effect = [subprocess.TimeoutExpired(['adb'], 5), 0]
            with self.assertRaisesRegex(AssertionError, 'wallet acceptance failed'):
                with smoke.stream_device_log(folder):
                    raise AssertionError('wallet acceptance failed')
            self.assertEqual(popen.call_args.args[0],
                             ['adb', '-s', 'emulator-5554', 'logcat', '-v', 'threadtime'])
            recorder.terminate.assert_called_once()
            recorder.kill.assert_called_once()
            self.assertEqual(recorder.wait.call_count, 2)

    def test_fresh_variant_selection_keeps_all_acceptance_and_restart_phases(self):
        for variant in (None, 'baseline', 'candidate'):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as directory:
                argv = ['emulator_smoke.py', '--output', directory, '--disposable-emulator']
                if variant:
                    argv += ['--variant', variant]
                with patch('sys.argv', argv), patch.object(smoke, 'require_disposable_emulator') as verify, \
                        patch.object(smoke, 'establish_emulator_root'), patch.object(smoke, 'disable_pixel_launcher'), \
                        patch.object(smoke, 'adb', return_value='Status: ok'), patch.object(smoke, 'capture'), \
                        patch.object(smoke, 'stream_device_log', side_effect=lambda folder: nullcontext()), \
                        patch.object(smoke, 'instrument') as instrument:
                    smoke.main()
                    verify.assert_called_once_with(True)
                    labels = [variant] if variant else ['baseline', 'candidate']
                    for label in labels:
                        calls = [c for c in instrument.call_args_list if c.args[0].parent.name == label]
                        self.assertEqual([c.args[1] for c in calls], ['seedOfflineWallet',
                            'bridgeVaultPersistsAcrossActivityRecreation',
                            'offlineWalletLogoStyleAndSyntheticOAuthCallback',
                            'processPersistencePhase', 'processPersistencePhase'])
                        self.assertEqual([c.args[3] for c in calls[-2:]], ['seed', 'verify'])
                    self.assertEqual(instrument.call_count, 5 * len(labels))

    def test_acceptance_failure_still_fails_the_selected_fresh_variant(self):
        with tempfile.TemporaryDirectory() as directory:
            argv = ['emulator_smoke.py', '--output', directory, '--disposable-emulator', '--variant', 'candidate']
            with patch('sys.argv', argv), patch.object(smoke, 'require_disposable_emulator'), \
                    patch.object(smoke, 'establish_emulator_root'), patch.object(smoke, 'disable_pixel_launcher'), \
                    patch.object(smoke, 'adb', return_value='Status: ok'), patch.object(smoke, 'capture') as capture, \
                    patch.object(smoke, 'stream_device_log', side_effect=lambda folder: nullcontext()), \
                    patch.object(smoke, 'instrument', side_effect=AssertionError('acceptance failed')):
                with self.assertRaisesRegex(AssertionError, 'acceptance failed'):
                    smoke.main()
                capture.assert_called_once()
                self.assertFalse((Path(directory) / 'default/candidate/device/passed.txt').exists())


if __name__ == '__main__':
    unittest.main()
