import { buildCsv } from './csvExport';

describe('buildCsv', () => {
  test('quotes cells, escapes embedded quotes, and uses CRLF row endings', () => {
    expect(buildCsv([['Description', 'Note'], ['Cafe, Inc.', 'said "hello"']]))
      .toBe('"Description","Note"\r\n"Cafe, Inc.","said ""hello"""');
  });

  test('neutralizes formula-leading user text but preserves numeric amounts', () => {
    expect(buildCsv([['Description', 'Amount'], ['=HYPERLINK("https://example.invalid")', -42]]))
      .toBe('"Description","Amount"\r\n"\'=HYPERLINK(""https://example.invalid"")","-42"');
    expect(buildCsv([['@SUM(1,1)', '+cmd', '-not a formula', '  =1+1']]))
      .toBe('"Description"');
  });

  test('converts nullish values to empty cells', () => {
    expect(buildCsv([[null, undefined, 'ok']])).toBe('"","","ok"');
  });

  test('rejects malformed row input', () => {
    expect(() => buildCsv(null)).toThrow('CSV rows must be an array');
    expect(() => buildCsv([null])).toThrow('Each CSV row must be an array');
  });
});
