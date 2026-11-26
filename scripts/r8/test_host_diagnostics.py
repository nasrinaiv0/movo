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

    def test_resolve_v2_nested_mount_and_ancestor_limits(self):
        proc=self.root/'proc';mount=self.root/'cg';member=proc/'12';selfdir=proc/'self'
        member.mkdir(parents=True);selfdir.mkdir();(mount/'service'/'emulator').mkdir(parents=True)
        (member/'cgroup').write_text('0::/host/service/emulator\n')
        (selfdir/'mountinfo').write_text(f'1 2 0:1 /host {mount} rw - cgroup2 cgroup rw\n')
        (mount/'service'/'emulator'/'memory.events').write_text('oom 3\noom_kill 2\nother 99\n')
        (mount/'service'/'memory.max').write_text('4096\n')
        from host_diagnostics import memory_group
        d=memory_group(proc,member);self.assertEqual(d['version'],2);self.assertEqual(d['levels'][0]['memory.events'],{'oom':3,'oom_kill':2});self.assertEqual(d['levels'][1]['memory.max'],4096);self.assertNotIn(str(mount),json.dumps(d))

    def test_resolve_v1_memory_controller(self):
        proc=self.root/'proc';mount=self.root/'memory';member=proc/'12';selfdir=proc/'self'
        member.mkdir(parents=True);selfdir.mkdir();(mount/'task').mkdir(parents=True)
        (member/'cgroup').write_text('5:cpu:/other\n8:memory:/task\n')
        (selfdir/'mountinfo').write_text(f'1 2 0:1 / {mount} rw - cgroup cgroup rw,memory\n')
        (mount/'task'/'memory.failcnt').write_text('4\n');(mount/'task'/'memory.oom_control').write_text('under_oom 1\noom_kill 2\n')
        from host_diagnostics import memory_group
        d=memory_group(proc,member);self.assertEqual(d['version'],1);self.assertEqual(d['levels'][0]['memory.failcnt'],4);self.assertEqual(d['levels'][0]['memory.oom_control']['oom_kill'],2)

    def test_unavailable_and_traversal_never_fabricate_zero(self):
        proc=self.root/'proc';member=proc/'12';selfdir=proc/'self';member.mkdir(parents=True);selfdir.mkdir()
        (selfdir/'mountinfo').write_text(f'1 2 0:1 / {self.root} rw - cgroup2 cgroup rw\n')
        from host_diagnostics import memory_group
        for line in ['0::/../escape\n','0::/missing\n','0::relative\n']:
            (member/'cgroup').write_text(line);self.assertEqual(memory_group(proc,member),{'unavailable':True})

    def test_wait_status_only_for_zombie_and_field_52(self):
        from host_diagnostics import wait_status
        stat=['Z']+['0']*49
        for raw,expected in [(9,{'signal':9,'core_dump':False}),(139,{'signal':11,'core_dump':True}),(256,{'exit_code':1}),(0,{'exit_code':0})]:
            stat[49]=str(raw);self.assertEqual(wait_status(stat),expected)
        self.assertIsNone(wait_status(stat[:20]));stat[0]='S';self.assertIsNone(wait_status(stat))

    @unittest.skipUnless(sys.platform.startswith('linux'), 'requires Linux procfs')
    def test_actual_unreaped_child_wait_status(self):
        import os
        import signal
        from host_diagnostics import wait_status
        child=subprocess.Popen([sys.executable,'-c','import time; time.sleep(30)'])
        try:
            child.send_signal(signal.SIGTERM)
            os.waitid(os.P_PID,child.pid,os.WEXITED|os.WNOWAIT)
            stat=(Path('/proc')/str(child.pid)/'stat').read_text().rsplit(')',1)[1].split()
            self.assertEqual(wait_status(stat),{'signal':signal.SIGTERM,'core_dump':False})
        finally:
            child.wait(timeout=5)

    def test_ancestor_limit_reports_truncation(self):
        proc=self.root/'proc';member=proc/'12';selfdir=proc/'self';member.mkdir(parents=True);selfdir.mkdir()
        mount=self.root/'cg';nested=mount.joinpath(*(['a']*8));nested.mkdir(parents=True)
        (member/'cgroup').write_text('0::/'+'/'.join(['a']*8)+'\n')
        (selfdir/'mountinfo').write_text(f'1 2 0:1 / {mount} rw - cgroup2 cgroup rw\n')
        (nested/'memory.current').write_text('123\n')
        from host_diagnostics import memory_group
        result=memory_group(proc,member);self.assertEqual(len(result['levels']),8);self.assertTrue(result['truncated'])
