"""Mocked integration tests of the actual patched frozen harness source files."""
from contextlib import nullcontext
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent
SCRIPTS = ROOT
sys.path.insert(0, str(SCRIPTS))
from native_evidence import EvidenceError, require_png
from test_native_evidence import tiny_png

def load(name, path):
    spec = importlib.util.spec_from_file_location(name,path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

ios=load('ios_harness',SCRIPTS/'ios-simulator-smoke.py')
r8=load('r8_harness',SCRIPTS/'r8'/'emulator_smoke.py')

class IosTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name); self.app=self.root/'App.app'; self.app.mkdir()
        self.screen=self.root/'screen.png'
        devices=json.dumps({'devices':{'iOS-26-5':[{'name':'iPad A16','udid':'fake-device','isAvailable':True,'state':'Booted'}]}})
        for obj,name,kwargs in [(ios,'run_command',{'return_value':devices}), (ios,'launch_with_cold_boot_retry',{}),(ios,'open_log_url_with_one_cold_recovery',{}),(ios.time,'sleep',{})]:
            p=patch.object(obj,name,**kwargs); p.start(); self.addCleanup(p.stop)
    def run_smoke(self, capture):
        with patch.object(ios,'capture_screenshot_with_one_cold_recovery',side_effect=capture):
            ios.smoke(str(self.app),str(self.screen),'ipad')
    def test_valid_image_accepts(self):
        self.run_smoke(lambda *_:self.screen.write_bytes(tiny_png()))
        self.assertEqual(require_png(self.screen),(1,1))
    def test_stale_image_cannot_pass_noop_capture(self):
        self.screen.write_bytes(tiny_png())
        with self.assertRaisesRegex(ios.SmokeFailure,'Invalid iOS screenshot evidence'):
            self.run_smoke(lambda *_:None)
        self.assertFalse(self.screen.exists())
    def test_zero_byte_fails(self):
        with self.assertRaisesRegex(ios.SmokeFailure,'Invalid iOS screenshot evidence'):
            self.run_smoke(lambda *_:self.screen.touch())
    def test_native_failure_not_swallowed(self):
        def fail(*_): raise ios.SmokeFailure('actual launch failure')
        with self.assertRaisesRegex(ios.SmokeFailure,'actual launch failure'): self.run_smoke(fail)

class R8CaptureTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.folder=Path(self.tmp.name)
    def test_failed_adb_capture_hard_fails(self):
        with patch.object(r8,'adb',side_effect=subprocess.CalledProcessError(255,['adb'])), patch.object(r8.subprocess,'run',side_effect=subprocess.CalledProcessError(255,['adb'])):
            with self.assertRaises(EvidenceError):r8.capture(self.folder)
        self.assertTrue((self.folder/'diagnostic-errors.txt').is_file())
    def test_zero_byte_screenshot_hard_fails(self):
        with patch.object(r8,'adb',return_value='synthetic diagnostics'),patch.object(r8.subprocess,'run'):
            with self.assertRaises(EvidenceError):r8.capture(self.folder)
    def test_complete_capture_accepts(self):
        def screen(*args,**kwargs):kwargs['stdout'].write(tiny_png())
        with patch.object(r8,'adb',return_value='synthetic diagnostics'),patch.object(r8.subprocess,'run',side_effect=screen):r8.capture(self.folder)
        self.assertEqual(require_png(self.folder/'screen.png'),(1,1))

class R8PassMarkerTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.output=Path(self.tmp.name); self.folder=self.output/'default'/'baseline'/'device'
        for name,kw in [('require_disposable_emulator',{}),('establish_emulator_root',{}),('disable_pixel_launcher',{}),('legal_fixture',{'return_value':{'date':'2026-11-25','revision':''}}),('adb',{'return_value':'Status: ok'}),('instrument',{}),('stream_device_log',{'side_effect':lambda _:nullcontext()})]:
            p=patch.object(r8,name,**kw);p.start();self.addCleanup(p.stop)
        p=patch.object(sys,'argv',['emulator_smoke.py','--output',str(self.output),'--disposable-emulator','--variant','baseline']);p.start();self.addCleanup(p.stop)
        # Mock only reading the legal fixture; the actual filesystem path operations stay real.
        p=patch.object(Path,'read_text',return_value='synthetic legal fixture');p.start();self.addCleanup(p.stop)
    def test_capture_failure_cannot_write_marker(self):
        with patch.object(r8,'capture',side_effect=EvidenceError('missing screenshot')):
            with self.assertRaises(EvidenceError):r8.main()
        self.assertFalse((self.folder/'passed.txt').exists())
    def test_success_marker_after_capture(self):
        def capture(folder):self.assertFalse((folder/'passed.txt').exists())
        with patch.object(r8,'capture',side_effect=capture):r8.main()
        self.assertTrue((self.folder/'passed.txt').is_file())
    def test_primary_failure_preserved_even_if_capture_fails(self):
        r8.instrument.side_effect=RuntimeError('native assertion failed')
        with patch.object(r8,'capture',side_effect=EvidenceError('capture also failed')):
            with self.assertRaisesRegex(RuntimeError,'native assertion failed'):r8.main()
        self.assertFalse((self.folder/'passed.txt').exists())
    def test_reused_folder_refused(self):
        self.folder.mkdir(parents=True)
        with patch.object(r8,'capture') as capture:
            with self.assertRaises(FileExistsError):r8.main()
            capture.assert_not_called()
        self.assertFalse((self.folder/'passed.txt').exists())

if __name__=='__main__':unittest.main()
