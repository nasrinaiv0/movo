import React, { useEffect, useState } from 'react';
import { Sheet } from './ui';
import { t as tr } from '../lib/i18n';

/** Read the licensed notices bundled with this exact app, without navigating away or contacting a vendor. */
export default function ThirdPartyNotices() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setFailed(false);
    fetch(`${process.env.PUBLIC_URL || ''}/third-party-notices.txt`, { signal: controller.signal }).then(response => {
      if (!response.ok) throw Error('notices_unavailable');
      return response.text();
    }).then(value => { if (!controller.signal.aborted) setText(value); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [open]);
  return <>
    <button type="button" className="inline-legal-link" onClick={() => setOpen(true)}>{tr('Third-party notices')}</button>
    {open && <Sheet title={tr('Third-party notices')} onClose={() => setOpen(false)} size="wide">
      {failed ? <p role="alert">{tr('Could not load notices. Close and try again.')}</p> : <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', font: 'inherit' }}>{text || tr('Loading…')}</pre>}
    </Sheet>}
  </>;
}
