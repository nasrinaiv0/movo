"""Host-independent native evidence checks. No networking or production access."""
from pathlib import Path
import struct
import zlib

PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'
MAX_PNG_BYTES = 64 * 1024 * 1024


class EvidenceError(RuntimeError):
    pass


def require_png(path):
    """Validate PNG container structure, dimensions, chunk CRCs and complete IEND.

    This checks evidence integrity, not whether a specific app screen is visible.
    Native assertions and independent visual review are still required.
    """
    path = Path(path)
    if not path.is_file() or path.stat().st_size > MAX_PNG_BYTES:
        raise EvidenceError(f'Missing or oversized screenshot: {path.name}')
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        raise EvidenceError(f'Empty or invalid PNG: {path.name}')
    pos, dimensions, saw_idat = 8, None, False
    while pos + 12 <= len(data):
        length = struct.unpack_from('>I', data, pos)[0]
        kind = data[pos + 4:pos + 8]
        end = pos + 12 + length
        if end > len(data):
            raise EvidenceError(f'Truncated PNG chunk: {path.name}')
        payload = data[pos + 8:pos + 8 + length]
        crc = struct.unpack_from('>I', data, pos + 8 + length)[0]
        if zlib.crc32(kind + payload) & 0xffffffff != crc:
            raise EvidenceError(f'PNG CRC mismatch: {path.name}')
        if pos == 8 and kind != b'IHDR':
            raise EvidenceError(f'PNG missing initial IHDR: {path.name}')
        if kind == b'IHDR':
            if dimensions is not None or length != 13:
                raise EvidenceError(f'Invalid PNG IHDR: {path.name}')
            dimensions = struct.unpack_from('>II', payload)
            if not all(0 < d <= 32768 for d in dimensions):
                raise EvidenceError(f'Invalid PNG dimensions: {path.name}')
        elif kind == b'IDAT':
            saw_idat = saw_idat or length > 0
        elif kind == b'IEND':
            if length or end != len(data) or not dimensions or not saw_idat:
                raise EvidenceError(f'Incomplete or trailing PNG data: {path.name}')
            return dimensions
        pos = end
    raise EvidenceError(f'PNG missing complete IEND: {path.name}')


def require_text(path):
    path = Path(path)
    if not path.is_file():
        raise EvidenceError(f'Missing diagnostic: {path.name}')
    # Stream the file to avoid unbounded logcat reads.
    with path.open('rb') as stream:
        while block := stream.read(65536):
            if block.strip():
                return
    raise EvidenceError(f'Empty diagnostic: {path.name}')


def require_r8_capture(folder):
    folder = Path(folder)
    require_png(folder / 'screen.png')
    for name in ('activity.txt', 'logcat.txt'):
        require_text(folder / name)
    error_file = folder / 'diagnostic-errors.txt'
    if error_file.exists():
        raise EvidenceError('Capture errors recorded; inspect diagnostic-errors.txt')


def fresh_capture_destination(path):
    """Clear just the requested screenshot; a prior run cannot satisfy this run."""
    path = Path(path)
    if path.is_symlink():
        raise EvidenceError('Refuse symlink screenshot destination')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    return path
