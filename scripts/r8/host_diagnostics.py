"""Read-only bounded Linux host telemetry; never grants acceptance credit."""
from contextlib import contextmanager
import json
from pathlib import Path
import re
import sys
import threading
import time

COMM = re.compile(r"^(?:qemu-system(?:-[\w]+)?|emulator|adb|crashpad_handle\w*)$")
MAX_SAMPLES = 128
MEMORY_FIELDS = {"MemTotal", "MemAvailable", "SwapTotal", "SwapFree"}
CGROUP_FIELDS = {"low", "high", "max", "oom", "oom_kill", "oom_group_kill"}

def snapshot(proc=Path('/proc'), cgroup=Path('/sys/fs/cgroup')):
    record = {"monotonic_ns": time.monotonic_ns(), "memory_kib": {}, "cgroup_memory_events": {}, "processes": []}
    try:
        for line in (proc/'meminfo').read_text().splitlines():
            name, _, rest = line.partition(':')
            if name in MEMORY_FIELDS:
                value = rest.strip().split()[0]
                if value.isdigit(): record['memory_kib'][name] = int(value)
    except (OSError, ValueError, IndexError):
        record['memory_unavailable'] = True
    try:
        for line in (cgroup/'memory.events').read_text().splitlines():
            fields = line.split()
            if len(fields)==2 and fields[0] in CGROUP_FIELDS and fields[1].isdigit():
                record['cgroup_memory_events'][fields[0]]=int(fields[1])
    except OSError:
        record['cgroup_unavailable'] = True
    try:
        for child in sorted(proc.iterdir(),key=lambda p:p.name):
            if not child.name.isdigit(): continue
            try:
                comm=(child/'comm').read_text().strip()
                if not COMM.fullmatch(comm): continue
                stat=(child/'stat').read_text().rsplit(')',1)[1].split()
                item={'pid':int(child.name),'comm':comm,'state':stat[0], 'start_ticks':int(stat[19])}
                # No argv, environment, paths, credentials or guest/user data.
                for line in (child/'status').read_text().splitlines():
                    if line.startswith('VmRSS:'):
                        item['rss_kib']=int(line.split()[1]); break
                record['processes'].append(item)
                if len(record['processes'])>=64: break
            except (OSError, ValueError, IndexError):
                continue
    except OSError:
        record['processes_unavailable']=True
    return record

@contextmanager
def record_stage(folder, stage, *, sampler=snapshot, interval=2.0):
    """Collect initial/periodic/final snapshots; diagnostic failure cannot hide the test exception."""
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,96}',stage):
        raise ValueError('invalid diagnostic stage')
    stop=threading.Event()
    target=Path(folder)/('host-'+stage+'.jsonl')
    log=None
    worker=None
    count=0
    lock=threading.Lock()
    def sample(phase):
        nonlocal count
        try:
            data=sampler()
            with lock:
                # Reserve final sample even if a stage runs for a long time.
                if count >= MAX_SAMPLES-1 and phase!='end': return
                data['phase']=phase;data['stage']=stage
                log.write(json.dumps(data,separators=(',',':'))+'\n');log.flush();count+=1
        except Exception as err:
            print('Host telemetry unavailable: '+type(err).__name__,file=sys.stderr)
    def poll():
        while not stop.wait(interval): sample('periodic')
    try:
        try:
            log=target.open('x',encoding='utf-8')
            sample('start')
            worker=threading.Thread(target=poll,daemon=True,name='movo-r8-host-diagnostics')
            worker.start()
        except (OSError,RuntimeError) as err:
            print('Host telemetry setup unavailable: '+type(err).__name__,file=sys.stderr)
        yield
    finally:
        stop.set()
        if worker is not None and worker.is_alive(): worker.join(timeout=3)
        # A stuck diagnostic must not stall acceptance or block the original error.
        if log is not None:
            if worker is not None and worker.is_alive():
                print('Host telemetry worker did not stop; diagnostic incomplete',file=sys.stderr)
            else:
                sample('end')
                try: log.close()
                except OSError: print('Host telemetry close failed',file=sys.stderr)
