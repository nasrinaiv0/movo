"""Read-only bounded Linux host telemetry; never grants acceptance credit."""
from contextlib import contextmanager
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
import threading
import time

COMM = re.compile(r"^(?:qemu-system(?:-[\w]+)?|emulator|adb|crashpad_handle\w*)$")
MAX_SAMPLES = 128
MEMORY_FIELDS = {"MemTotal", "MemAvailable", "SwapTotal", "SwapFree"}
CGROUP_FIELDS = {"low", "high", "max", "oom", "oom_kill", "oom_group_kill"}

def wait_status(stat):
    # Linux proc_pid_stat(5), field 52, after stripping PID and comm.
    # The kernel's wait status is useful only for an observed zombie.
    if stat[0] != 'Z' or len(stat) <= 49:
        return None
    try:
        raw = int(stat[49])
        if not 0 <= raw <= 65535:
            return None
        if os.WIFSIGNALED(raw):
            return {'signal': os.WTERMSIG(raw), 'core_dump': os.WCOREDUMP(raw)}
        if os.WIFEXITED(raw):
            return {'exit_code': os.WEXITSTATUS(raw)}
    except (ValueError, OverflowError):
        pass
    return None


def memory_group(proc, member):
    """Resolve the process memory cgroup from kernel metadata, not a guessed root.

    Report numeric counters only. Missing/denied counters are not zero.
    Include bounded ancestor limits, because an ancestor may enforce the limit.
    """
    try:
        memberships = (member/'cgroup').read_text().splitlines()
        mounts = (proc/'self'/'mountinfo').read_text().splitlines()
        for line in memberships[:64]:
            parts = line.split(':', 2)
            if len(parts) != 3:
                continue
            hierarchy, controllers, raw_path = parts
            version = 2 if hierarchy == '0' and not controllers else 1 if 'memory' in controllers.split(',') else 0
            if not version:
                continue
            path = PurePosixPath(raw_path)
            if not path.is_absolute() or '..' in path.parts:
                continue
            matches = []
            for mount in mounts[:1024]:
                left, sep, right = mount.partition(' - ')
                fields, fs = left.split(), right.split()
                if not sep or len(fields) < 6 or len(fs) < 3:
                    continue
                if version == 2 and fs[0] != 'cgroup2':
                    continue
                if version == 1 and (fs[0] != 'cgroup' or 'memory' not in fs[2].split(',')):
                    continue
                unescape = lambda s: re.sub(r'\\(040|011|012|134)', lambda m: chr(int(m[1], 8)), s)
                root = PurePosixPath(unescape(fields[3]))
                mountpoint = Path(unescape(fields[4]))
                if not root.is_absolute() or '..' in root.parts or not mountpoint.is_absolute() or '..' in mountpoint.parts:
                    continue
                try:
                    rel = path.relative_to(root)
                except ValueError:
                    continue
                matches.append((len(root.parts), mountpoint, rel))
            if not matches:
                continue
            _, mountpoint, rel = max(matches, key=lambda x: x[0])
            levels = []
            reached_root = False
            current = mountpoint.joinpath(*rel.parts)
            for depth in range(8):
                row = {'depth': depth}
                scalars = ('memory.current', 'memory.max', 'memory.peak') if version == 2 else ('memory.usage_in_bytes', 'memory.limit_in_bytes', 'memory.max_usage_in_bytes', 'memory.failcnt')
                for name in scalars:
                    try:
                        value = (current/name).read_text().strip()
                        if value.isdigit(): row[name] = int(value)
                        elif name == 'memory.max' and value == 'max': row[name] = 'max'
                    except (OSError, ValueError):
                        pass
                counters = ('memory.events', 'memory.events.local') if version == 2 else ('memory.oom_control',)
                for name in counters:
                    try:
                        values = {}
                        for raw in (current/name).read_text().splitlines():
                            fields = raw.split()
                            if len(fields) == 2 and fields[0] in CGROUP_FIELDS | {'under_oom', 'oom_kill_disable'} and fields[1].isdigit():
                                values[fields[0]] = int(fields[1])
                        if values: row[name] = values
                    except (OSError, ValueError):
                        pass
                levels.append(row)
                if current == mountpoint:
                    reached_root = True
                    break
                current = current.parent
            if any(len(row) > 1 for row in levels):
                return {'version': version, 'levels': levels, 'truncated': not reached_root}
        return {'unavailable': True}
    except (OSError, ValueError):
        return {'unavailable': True}


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
    record['runner_memory_group'] = memory_group(proc, proc/'self')
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
                if comm.startswith(('qemu-system', 'emulator')):
                    item['memory_group'] = memory_group(proc, child)
                    status = wait_status(stat)
                    if status is not None: item['wait_status'] = status
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
