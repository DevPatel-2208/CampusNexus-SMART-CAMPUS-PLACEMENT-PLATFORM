const { buildPdf } = require('../src/services/pdf.service');

describe('pdf.service', () => {
  test('produces a structurally valid PDF buffer', () => {
    const pdf = buildPdf({ title: 'Students Report', subtitle: 'Generated' });
    pdf.heading('Summary');
    pdf.keyValues([['Total', 5], ['Placed', 3]]);
    const buf = pdf.build();
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 8).toString()).toBe('%PDF-1.4');
    const s = buf.toString('latin1');
    expect(s).toContain('xref');
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  test('xref start offset points to the xref table', () => {
    const pdf = buildPdf({ title: 'T' });
    pdf.paragraph('hello '.repeat(100));
    const s = pdf.build().toString('latin1');
    const off = parseInt(s.match(/startxref\s+(\d+)/)[1], 10);
    expect(s.slice(off, off + 4)).toBe('xref');
  });

  test('paginates long tables across multiple pages', () => {
    const pdf = buildPdf({ title: 'T', landscape: true });
    pdf.table([{ key: 'a', label: 'A', width: 1 }], Array.from({ length: 120 }, (_, i) => ({ a: 'row ' + i })));
    const s = pdf.build().toString('latin1');
    const pages = (s.match(/\/Type \/Page[^s]/g) || []).length;
    expect(pages).toBeGreaterThan(1);
  });

  test('escapes PDF control characters', () => {
    const pdf = buildPdf({ title: 'T' });
    pdf.paragraph('parens ( ) and backslash \\ and unicode ✓');
    expect(() => pdf.build()).not.toThrow();
  });
});
