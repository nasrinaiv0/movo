"""Run as the disposable PostgreSQL owner after iap-db.test.sql. No production URL."""
import concurrent.futures, subprocess, threading
barrier=threading.Barrier(2)
def attempt(_):
    barrier.wait()
    return subprocess.run(['psql','-v','ON_ERROR_STOP=1','-d','iap_security','-Atc',
      "set role service_role; select public.movo_iap_acquire('google',repeat('d',64));"],capture_output=True,text=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(attempt,range(2)))
assert sum(r.returncode==0 for r in results)==1, 'Expected exactly one lease winner'
assert sum('iap_busy' in r.stderr for r in results)==1, 'Expected the concurrent request to fail closed'
print('PASS: two independent PostgreSQL connections race; exactly one verifier acquires the lease')
