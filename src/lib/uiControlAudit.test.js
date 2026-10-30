const { auditSourceText, createAuditState } = require('../../scripts/audit-ui-controls');

function scan(source) {
  return auditSourceText(source, 'src/fixture.jsx', createAuditState());
}

describe('UI control audit', () => {
  test('flags placeholder links that have no real action', () => {
    const result = scan('<a href="#">Learn more</a>');
    expect(result.errors.some((error) => error.includes('placeholder href'))).toBe(true);
  });

  test('flags enabled controls with obviously empty inline handlers', () => {
    const result = scan('<button type="button" onClick={() => {}}>Do nothing</button>');
    expect(result.errors.some((error) => error.includes('onClick is an empty/no-op inline handler'))).toBe(true);
  });

  test('checks conditional controls for empty handlers but skips statically disabled controls', () => {
    const conditional = scan('<button type="button" disabled={isSaving} onClick={() => {}}>Save</button>');
    expect(conditional.errors.some((error) => error.includes('onClick is an empty/no-op inline handler'))).toBe(true);

    const explicitlyEnabled = scan('<button type="button" disabled={false} onClick={() => undefined}>Save</button>');
    expect(explicitlyEnabled.errors.some((error) => error.includes('onClick is an empty/no-op inline handler'))).toBe(true);

    const disabled = scan('<button type="button" disabled title="Unavailable" onClick={() => {}}>Save</button>');
    expect(disabled.errors.some((error) => error.includes('onClick is an empty/no-op inline handler'))).toBe(false);

    const ariaDisabled = scan('<button type="button" disabled={false} aria-disabled={true} title="Unavailable" onClick={() => {}}>Save</button>');
    expect(ariaDisabled.errors.some((error) => error.includes('onClick is an empty/no-op inline handler'))).toBe(false);
  });

  test('requires custom ARIA tabs to expose selection and keyboard behavior', () => {
    const result = scan('<div role="tab" onClick={() => {}}>Overview</div>');
    expect(result.errors.some((error) => error.includes('click and keyboard handlers'))).toBe(true);
    expect(result.errors.some((error) => error.includes('aria-selected'))).toBe(true);
  });

  test('accepts a custom ARIA tab with state and keyboard handling', () => {
    const result = scan('<div role="tab" aria-selected={true} onClick={() => selectTab("overview")} onKeyDown={(event) => handleTabKey(event)}>Overview</div>');
    expect(result.errors).toEqual([]);
  });

  test('requires checked state for switches and radio controls', () => {
    const result = scan('<button type="button" role="switch" onClick={() => {}}>Sync</button>');
    expect(result.errors.some((error) => error.includes('must expose checked state'))).toBe(true);
  });

  test('requires an accessible name for dialogs', () => {
    const result = scan('<div role="dialog" aria-modal="true"><h2>Preferences</h2></div>');
    expect(result.errors.some((error) => error.includes('must have an accessible name'))).toBe(true);
  });

  test('accepts disabled controls with accessible explanations or busy state', () => {
    const result = scan('<><button type="submit" disabled aria-busy={true}>Saving</button><button disabled aria-describedby="reason">Import</button><p id="reason">Choose a valid file first.</p></>');
    expect(result.disabledReview).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test('accepts named modal dialogs and named native radio controls', () => {
    const result = scan('<><div role="dialog" aria-modal="true" aria-label="Preferences" /><button type="button" role="radio" aria-checked={true} onClick={() => setTheme("dark")}>Dark</button></>');
    expect(result.errors).toEqual([]);
  });
});
