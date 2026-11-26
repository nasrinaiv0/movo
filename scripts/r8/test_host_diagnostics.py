import json
from pathlib import Path
import tempfile
import subprocess
import sys
import time
import unittest
from host_diagnostics import snapshot, record_stage

class TestHostDiagnostics(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
    def test_filtered_process_memory_and_no_secret_fields(self):
        (self.root/'meminfo').write_text('MemTotal: 16000 kB\nMemAvailable: 4000 kB\nUnrelated: 900 kB\n')
        (self.root/'memory.events').write_text('oom 2\noom_kill 1\nother 5\n')
        for pid,name in [('12','qemu-system-x86'),('13','other-process')]:
            p=self.root/pid;p.mkdir();(p/'comm').write_text(name+'\n');(p/'stat').write_text(pid+' ('+name+') S '+' '.join(['1']*30));(p/'status').write_text('VmRSS: 128 kB\n');(p/'cmdline').write_text('SYNTHETIC_SECRET');(p/'environ').write_text('SYNTHETIC_SECRET')
        d=snapshot(self.root,self.root);self.assertEqual(d['memory_kib'],{'MemTotal':16000,'MemAvailable':4000});self.assertEqual(d['cgroup_memory_events'],{'oom':2,'oom_kill':1});self.assertEqual(len(d['processes']),1);self.assertEqual(d['processes'][0]['rss_kib'],128);self.assertNotIn('SYNTHETIC_SECRET',json.dumps(d))
    def test_start_periodic_end_samples_and_stage(self):
        with record_stage(self.root,'fixture',sampler=lambda:{'ok':True},interval=0.01):time.sleep(.045)
        rows=[json.loads(x) for x in (self.root/'host-fixture.jsonl').read_text().splitlines()];self.assertEqual(rows[0]['phase'],'start');self.assertEqual(rows[-1]['phase'],'end');self.assertTrue(any(r['phase']=='periodic' for r in rows));self.assertTrue(all(r['stage']=='fixture' for r in rows))
    def test_failed_stage_preserves_original_exception(self):
        original=RuntimeError('synthetic original');caught=None
        try:
            with record_stage(self.root,'failure',sampler=lambda:{'ok':True}):raise original
        except RuntimeError as e:caught=e
        self.assertIs(caught,original);self.assertIn('"phase":"end"',(self.root/'host-failure.jsonl').read_text());self.assertFalse((self.root/'passed.txt').exists())
    def test_unavailable_proc_is_diagnostic_only(self):
        d=snapshot(self.root/'absent',self.root/'absent');self.assertTrue(d['memory_unavailable']);self.assertTrue(d['cgroup_unavailable']);self.assertTrue(d['processes_unavailable'])
    def test_existing_file_never_overwritten(self):
        p=self.root/'host-fixture.jsonl';p.write_text('old\n')
        with record_stage(self.root,'fixture',sampler=lambda:{}):pass
        self.assertEqual(p.read_text(),'old\n')
    def test_sample_failure_keeps_acceptance_failure(self):
        def fail():raise OSError('synthetic unavailable')
        with self.assertRaisesRegex(ValueError,'original'):
            with record_stage(self.root,'fixture',sampler=fail):raise ValueError('original')
    def test_reject_path_traversal(self):
        with self.assertRaises(ValueError):
            with record_stage(self.root,'../bad'):pass

    def test_harness_dynamic_import_without_r8_on_sys_path(self):
        # Reproduce Phase 1's importlib loading rather than relying on unittest's
        # insertion of the R8 test directory onto sys.path.
        harness = Path(__file__).resolve().with_name('emulator_smoke.py')
        code = ("import importlib.util, sys; "
                "s=importlib.util.spec_from_file_location('r8_harness',sys.argv[1]); "
                "m=importlib.util.module_from_spec(s); s.loader.exec_module(m); "
                "assert callable(m.record_stage)")
        result = subprocess.run([sys.executable, '-I', '-c', code, str(harness)],
                                capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
