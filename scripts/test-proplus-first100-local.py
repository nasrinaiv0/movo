"""Isolated local PostgreSQL test for the first-100 Pro+ migration.
MOVO_PG_SOCKET=1 PGPORT=55432 python3 scripts/test-proplus-first100-local.py
Never runs against a public host or production Supabase; creates and drops a disposable database.
"""
import os
import runpy
import subprocess
from pathlib import Path

if (os.environ.get('PGPORT') != '55432'
    or os.environ.get('PGHOST', '/var/run/postgresql' if os.environ.get('MOVO_PG_SOCKET') == '1' else '127.0.0.1')
       not in ('127.0.0.1','localhost','/var/run/postgresql')):
    raise SystemExit('Refusing nonlocal PostgreSQL test target or unapproved port.')

root = Path(__file__).resolve().parents[1]
ctx = runpy.run_path(str(root / 'scripts/test-plan-migration.py'))
env = ctx['env']
try:
    ctx['sql']((next((root / 'supabase/migrations').glob('*_movo_proplus_launch_first100.sql'))).read_text())
    ctx['sql']((root / 'supabase/tests/proplus_first100.test.sql').read_text())
    print('PASS: founder award cap, ownership, store-verification gate, idempotency, refund handling')
finally:
    subprocess.run(['dropdb', '-h', env['PGHOST'], '-p', env['PGPORT'], '--if-exists', env['PGDATABASE']],
      env=env, check=True)
