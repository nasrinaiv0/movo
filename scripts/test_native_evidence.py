import struct
import tempfile
import unittest
from pathlib import Path
import zlib
from native_evidence import EvidenceError, require_png, require_text, require_r8_capture, fresh_capture_destination


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind+data) & 0xffffffff)


def tiny_png():
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB',1,1,8,2,0,0,0))
            + chunk(b'IDAT', zlib.compress(b'\x00\x00\x00\x00')) + chunk(b'IEND', b''))


class NativeEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.screen = self.folder / 'screen.png'

    def test_valid_png(self):
        self.screen.write_bytes(tiny_png())
        self.assertEqual(require_png(self.screen), (1,1))

    def test_empty_png(self):
        self.screen.touch()
        with self.assertRaises(EvidenceError): require_png(self.screen)

    def test_missing_png(self):
        with self.assertRaises(EvidenceError): require_png(self.screen)

    def test_truncated_png(self):
        self.screen.write_bytes(tiny_png()[:-3])
        with self.assertRaises(EvidenceError): require_png(self.screen)

    def test_corrupt_png_crc(self):
        b=bytearray(tiny_png()); b[20]^=1; self.screen.write_bytes(b)
        with self.assertRaises(EvidenceError): require_png(self.screen)

    def test_trailing_data(self):
        self.screen.write_bytes(tiny_png()+b'junk')
        with self.assertRaises(EvidenceError): require_png(self.screen)

    def test_no_idat(self):
        self.screen.write_bytes(tiny_png()[:33]+chunk(b'IEND', b''))
        with self.assertRaises(EvidenceError): require_png(self.screen)

    def test_stale_screenshot_removed(self):
        self.screen.write_bytes(tiny_png())
        fresh_capture_destination(self.screen)
        self.assertFalse(self.screen.exists())
        with self.assertRaises(EvidenceError): require_png(self.screen)

    def test_symlink_rejected(self):
        other=self.folder/'keep.png'; other.write_bytes(tiny_png()); self.screen.symlink_to(other)
        with self.assertRaises(EvidenceError): fresh_capture_destination(self.screen)
        self.assertTrue(other.exists())

    def test_empty_activity_rejected(self):
        (self.folder/'activity.txt').write_text(' \n')
        with self.assertRaises(EvidenceError): require_text(self.folder/'activity.txt')

    def test_complete_capture(self):
        self.screen.write_bytes(tiny_png())
        for name in ('activity.txt','logcat.txt'): (self.folder/name).write_text('synthetic diagnostic\n')
        require_r8_capture(self.folder)

    def test_missing_log_rejected(self):
        self.screen.write_bytes(tiny_png()); (self.folder/'activity.txt').write_text('synthetic diagnostic\n')
        with self.assertRaises(EvidenceError): require_r8_capture(self.folder)

    def test_recorded_error_rejected(self):
        self.screen.write_bytes(tiny_png())
        for name in ('activity.txt','logcat.txt','diagnostic-errors.txt'): (self.folder/name).write_text('synthetic diagnostic\n')
        with self.assertRaises(EvidenceError): require_r8_capture(self.folder)

if __name__ == '__main__': unittest.main()
