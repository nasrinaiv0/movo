const { auditSourceText, createAuditState } = require('../../scripts/audit-ui-controls');

function scan(source) {
  return auditSourceText(source, 'src/fixture.jsx', createAuditState());
}

describe('UI control audit', () => {
  test('flags placeholder links that have no real action', () => {
    const result = scan('<a href="#">Learn more</a>');
    expect(result.errors.some((error) => error.includes('placeholder href'))).toBe(true);
  });

  test('requires custom ARIA tabs to expose selection and keyboard behavior', () => {
    const result = scan('<div role="tab" onClick={() => {}}>Overview</div>');
    expect(result.errors.some((error) => error.includes('click and keyboard handlers'))).toBe(true);
    expect(result.errors.some((error) => error.includes('aria-selected'))).toBe(true);
  });

  test('accepts a custom ARIA tab with state and keyboard handling', () => {
    const result = scan('<div role="tab" aria-selected={true} onClick={() => {}} onKeyDown={() => {}}>Overview</div>');
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

  test('accepts named modal dialogs and named native radio controls', () => {
    const result = scan('<><div role="dialog" aria-modal="true" aria-label="Preferences" /><button type="button" role="radio" aria-checked={true} onClick={() => {}}>Dark</button></>');
    expect(result.errors).toEqual([]);
  });
});
