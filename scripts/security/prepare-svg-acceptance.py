"""Verify the exact independently tested SVG lock and overlay only an isolated CI checkout."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess

BASE = {'package.json': 'c1cdd6d6f3eba1c15813a431d8a0dc801e4c8d50b8def8505d49583f7b4d95f7',
        'package-lock.json': '6dfb2438f5d7f5917ae8a2e98d4ade82e2aa76b7e5a0395cf6b20073c6e0b4f6'}
CANDIDATE = {'package.json': 'cc7100fc0963b7a848590a4d75226566db6238889fe2425f1e71cf8e90de7a6f',
             'package-lock.json': 'f46ef65a64a1281f8e8e48211d40ae5f2159c484440a1ebbb698ecb306b2c91d'}
RUN_ID = 45736289352
ARTIFACT_ID = 15079705770


def read_exact(root, pins):
    result = {}
    for name, expected in pins.items():
        p = root / name
        if p.is_symlink() or not p.is_file():
            raise ValueError('Missing or unsafe file: ' + name)
        data = p.read_bytes()
        if sha256(data).hexdigest() != expected:
            raise ValueError('SHA-256 mismatch: ' + name)
        result[name] = data
    return result


def production(lock):
    if lock.get('lockfileVersion') != 3:
        raise ValueError('Unexpected lock format')
    packages = lock['packages']
    return packages[''], {k: v for k, v in packages.items() if k and v.get('dev') is not True}


def validate(base, candidate):
    a, b = (json.loads(x['package-lock.json']) for x in (base, candidate))
    if production(a) != production(b):
        raise ValueError('Production lock graph changed')
    if len(production(a)[1]) != 163:
        raise ValueError('Unexpected production graph count')
    p, q = (json.loads(x['package.json']) for x in (base, candidate))
    expected = dict(p['overrides'], **{'react-scripts@5.0.1': {'@svgr/webpack': '6.5.1'},
                                    '@svgr/plugin-svgo@6.5.1': {'svgo': '2.8.4'}})
    if q != dict(p, overrides=expected):
        raise ValueError('Unexpected package manifest change')


def prepare(checkout, artifact, evidence, head):
    checkout, artifact, evidence = (Path(x).resolve() for x in (checkout, artifact, evidence))
    if not re.fullmatch('[0-9a-f]{40}', head):
        raise ValueError('Invalid head')
    if checkout in evidence.parents or evidence == checkout or checkout in artifact.parents or artifact == checkout:
        raise ValueError('Input and evidence must be outside checkout')
    git = lambda *args: subprocess.check_output(['git', '-C', str(checkout), *args], text=True).strip()
    if git('rev-parse', 'HEAD') != head or git('status', '--porcelain'):
        raise ValueError('Checkout is not the clean exact head')
    if evidence.exists():
        raise ValueError('Evidence already exists')
    base = read_exact(checkout, BASE)
    candidate = read_exact(artifact, CANDIDATE)
    validate(base, candidate)
    for name, data in candidate.items():
        (checkout / name).write_bytes(data)
    read_exact(checkout, CANDIDATE)
    evidence.write_text(json.dumps(provenance(head), indent=2)+'\n')


def provenance(head):
    return {'source_head': head, 'variant': 'svg-candidate', 'run_id': RUN_ID,
            'artifact_id': ARTIFACT_ID, 'baseline': BASE, 'candidate': CANDIDATE}


def verify_final(checkout, evidence, head):
    checkout, evidence = Path(checkout).resolve(), Path(evidence).resolve()
    actual = subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != head or evidence.is_symlink() or json.loads(evidence.read_text()) != provenance(head):
        raise ValueError('Candidate provenance changed')
    read_exact(checkout, CANDIDATE)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ('checkout', 'evidence', 'head'):
        parser.add_argument('--'+name, required=True)
    parser.add_argument('--artifact')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    if args.verify_only:
        verify_final(args.checkout, args.evidence, args.head)
    else:
        if not args.artifact:
            parser.error('--artifact required for preparation')
        prepare(args.checkout, args.artifact, args.evidence, args.head)
