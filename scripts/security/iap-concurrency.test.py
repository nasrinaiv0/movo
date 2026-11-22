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

# Distinct device sessions share the same verified MOVO account entitlement.
def read_tester_plan(_):
    query = """set role authenticated;
      select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
      select set_config('request.jwt.claims','{"role":"authenticated"}',false);
      select public.movo_plan_status()->>'tier';"""
    result = subprocess.run(['psql','-v','ON_ERROR_STOP=1','-d','iap_security','-Atc',query],capture_output=True,text=True)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip().splitlines()[-1]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    plans = list(pool.map(read_tester_plan, range(2)))
assert plans == ['pro_plus', 'pro_plus'], 'Both authenticated devices must see the same test subscription'
print('PASS: two independent authenticated devices read the same verified tester plan')
