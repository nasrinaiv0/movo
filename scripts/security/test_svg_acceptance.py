"""Negative tests with synthetic pins; exact real lock is checked separately in CI."""
import importlib.util
from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('svg_acceptance', Path(__file__).with_name('prepare-svg-acceptance.py'))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class SvgAcceptanceTests(unittest.TestCase):
    def test_exact_bytes_and_missing_or_wrong_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'package.json'
            pin = {'package.json': sha256(b'fixture').hexdigest()}
            with self.assertRaises(ValueError): mod.read_exact(p.parent, pin)
            p.write_bytes(b'fixture')
            self.assertEqual(mod.read_exact(p.parent, pin), {'package.json': b'fixture'})
            p.write_bytes(b'changed')
            with self.assertRaises(ValueError): mod.read_exact(p.parent, pin)

    def test_refuse_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); (root/'real').write_bytes(b'x'); (root/'package.json').symlink_to(root/'real')
            with self.assertRaises(ValueError): mod.read_exact(root, {'package.json': sha256(b'x').hexdigest()})

    def pair(self):
        pkg = {'overrides': {'existing': '1'}}
        lock = {'lockfileVersion': 3, 'packages': {'': {}, **{f'node_modules/p{i}': {'version':'1'} for i in range(163)}, 'node_modules/svg': {'version':'1','dev':True}}}
        new = json.loads(json.dumps(lock)); new['packages']['node_modules/svg']['version']='2'
        candidate = {'overrides': {'existing':'1','react-scripts@5.0.1':{'@svgr/webpack':'6.5.1'},'@svgr/plugin-svgo@6.5.1':{'svgo':'2.8.4'}}}
        return {'package.json':json.dumps(pkg),'package-lock.json':json.dumps(lock)}, {'package.json':json.dumps(candidate),'package-lock.json':json.dumps(new)}

    def test_accept_only_development_change(self):
        mod.validate(*self.pair())

    def test_reject_production_drift(self):
        base,cand=self.pair(); lock=json.loads(cand['package-lock.json']);lock['packages']['node_modules/p0']['version']='2';cand['package-lock.json']=json.dumps(lock)
        with self.assertRaises(ValueError): mod.validate(base,cand)

    def test_reject_manifest_drift(self):
        base,cand=self.pair(); pkg=json.loads(cand['package.json']);pkg['scripts']={'test':'true'};cand['package.json']=json.dumps(pkg)
        with self.assertRaises(ValueError): mod.validate(base,cand)

    def test_reject_wrong_head_before_overlay(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); checkout=root/'checkout'; checkout.mkdir(); artifact=root/'artifact'; artifact.mkdir()
            with patch.object(mod.subprocess,'check_output',return_value='b'*40):
                with self.assertRaises(ValueError): mod.prepare(checkout,artifact,root/'evidence.json','a'*40)

    def test_verify_final_detects_provenance_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); evidence=root/'evidence.json'; evidence.write_text(json.dumps(mod.provenance('a'*40)))
            with patch.object(mod.subprocess,'check_output',return_value='a'*40), patch.object(mod,'read_exact') as read:
                mod.verify_final(root,evidence,'a'*40); read.assert_called_once_with(root,mod.CANDIDATE)
                evidence.write_text('{}')
                with self.assertRaises(ValueError): mod.verify_final(root,evidence,'a'*40)

if __name__ == '__main__': unittest.main()
