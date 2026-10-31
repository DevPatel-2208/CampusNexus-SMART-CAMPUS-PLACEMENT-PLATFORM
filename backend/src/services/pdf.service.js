'use strict';

/**
 * CareerConnect Enterprise PDF Generation Engine
 * Generates publication-ready, mathematically aligned institutional PDF ledgers.
 * Compatible with all standard PDF readers (Adobe Acrobat, Chrome, Preview).
 */

const A4_PORTRAIT = { w: 595.28, h: 841.89 };
const A4_LANDSCAPE = { w: 841.89, h: 595.28 };
const MARGIN = { left: 36, right: 36, top: 32, bottom: 36 };

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ')
    .replace(/[\u20B9]/g, 'Rs. ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022]/g, '*')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function approxTextWidth(str, fontSize = 9) {
  return String(str || '').length * fontSize * 0.52;
}

function wrapCellText(text, maxChars, maxLines = 3) {
  const clean = String(text == null ? '' : text).trim();
  if (!clean) return ['-'];

  const words = clean.split(/\s+/).filter(Boolean);
  if (!words.length) return ['-'];

  const lines = [];
  let cur = '';

  for (const w of words) {
    if (!cur) {
      if (w.length > maxChars) {
        lines.push(w.slice(0, maxChars));
        cur = w.slice(maxChars);
      } else {
        cur = w;
      }
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      if (lines.length >= maxLines) {
        const last = lines[lines.length - 1];
        lines[lines.length - 1] = last.length > maxChars - 3 ? last.slice(0, maxChars - 3) + '...' : last + '...';
        return lines;
      }
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }

  if (cur && lines.length < maxLines) {
    lines.push(cur);
  } else if (cur && lines.length >= maxLines) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.length > maxChars - 3 ? last.slice(0, maxChars - 3) + '...' : last + '...';
  }

  return lines.length ? lines : ['-'];
}

class Pdf {
  constructor({
    title = 'Official Report',
    subtitle = 'CareerConnect Campus Placement Management',
    institution = 'CareerConnect Institutional Placement Cell',
    footer = 'CareerConnect Official Record • Confidential',
    landscape = false,
  } = {}) {
    this.size = landscape ? A4_LANDSCAPE : A4_PORTRAIT;
    this.title = title;
    this.subtitle = subtitle;
    this.institution = institution;
    this.footer = footer;
    this.isLandscape = landscape;
    this.pages = [];
    this._initPage();
  }

  get contentWidth() {
    return this.size.w - MARGIN.left - MARGIN.right;
  }

  _op(str) {
    this.ops.push(str);
  }

  _initPage(isSubsequent = false) {
    this.ops = [];
    this.pages.push(this.ops);
    this.y = MARGIN.top;

    if (!isSubsequent) {
      this._drawCoverHeader();
    } else {
      this._drawRunningHeader();
    }
  }

  _drawCoverHeader() {
    const totalW = this.contentWidth;
    const bannerH = 64;

    // Header container: Navy background
    this._rect(MARGIN.left, this.y, totalW, bannerH, '0.06 0.09 0.16', '0.12 0.16 0.24', 1);

    // Accent left stripe (Royal Blue)
    this._rect(MARGIN.left, this.y, 6, bannerH, '0.15 0.39 0.92');

    // Brand eyebrow
    this._text('CAREERCONNECT • CAMPUS PLACEMENT MANAGEMENT SYSTEM', MARGIN.left + 16, this.y + 16, 7.5, 'F2', '0.38 0.65 0.98');

    // Report Title
    this._text(this.title.toUpperCase(), MARGIN.left + 16, this.y + 34, 14, 'F2', '1 1 1');

    // Subtitle & Institution
    const sub = `${this.subtitle} | Verified Registry`;
    this._text(sub, MARGIN.left + 16, this.y + 50, 8.5, 'F1', '0.78 0.84 0.94');

    // Right-side Timestamp & Seal Badge
    const dateStr = `Export Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    const timeStr = `Generated: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    const rightX = this.size.w - MARGIN.right - 140;

    this._text(dateStr, rightX, this.y + 26, 8, 'F2', '0.85 0.90 0.98');
    this._text(timeStr, rightX, this.y + 40, 7.5, 'F1', '0.62 0.70 0.85');
    this._text('STATUS: OFFICIAL AUDIT COPY', rightX, this.y + 52, 7, 'F2', '0.22 0.75 0.45');

    this.y += bannerH + 16;
  }

  _drawRunningHeader() {
    const totalW = this.contentWidth;
    const headerH = 26;

    // Compact running banner
    this._rect(MARGIN.left, this.y, totalW, headerH, '0.96 0.97 0.99', '0.88 0.91 0.95', 0.5);
    this._text(`CareerConnect Institutional Ledger  •  ${this.title}`, MARGIN.left + 10, this.y + 16, 8.5, 'F2', '0.15 0.20 0.30');

    const curPage = this.pages.length;
    const rightText = `Document Ref: CC-${this.title.slice(0, 3).toUpperCase()} • Active Registry`;
    const rx = this.size.w - MARGIN.right - approxTextWidth(rightText, 8) - 10;
    this._text(rightText, rx, this.y + 16, 8, 'F1', '0.45 0.52 0.62');

    this.y += headerH + 12;
  }

  _rect(x, y, w, h, fillRGB, strokeRGB, lineWidth = 0.5) {
    const bottomY = (this.size.h - y - h).toFixed(2);
    if (fillRGB && strokeRGB) {
      this._op(`${strokeRGB} RG ${lineWidth} w ${fillRGB} rg ${x.toFixed(2)} ${bottomY} ${w.toFixed(2)} ${h.toFixed(2)} re B`);
    } else if (fillRGB) {
      this._op(`${fillRGB} rg ${x.toFixed(2)} ${bottomY} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    } else if (strokeRGB) {
      this._op(`${strokeRGB} RG ${lineWidth} w ${x.toFixed(2)} ${bottomY} ${w.toFixed(2)} ${h.toFixed(2)} re s`);
    }
  }

  _line(x1, y1, x2, y2, strokeRGB = '0.88 0.91 0.95', lineWidth = 0.5) {
    const py1 = (this.size.h - y1).toFixed(2);
    const py2 = (this.size.h - y2).toFixed(2);
    this._op(`${strokeRGB} RG ${lineWidth} w ${x1.toFixed(2)} ${py1} m ${x2.toFixed(2)} ${py2} l S`);
  }

  _text(str, x, y, size = 9, font = 'F1', rgb = '0.15 0.20 0.30') {
    const py = (this.size.h - y).toFixed(2);
    this._op(`BT /${font} ${size} Tf ${rgb} rg 1 0 0 1 ${x.toFixed(2)} ${py} Tm (${esc(str)}) Tj ET`);
  }

  _ensureSpace(neededHeight) {
    if (this.y + neededHeight > this.size.h - MARGIN.bottom) {
      this._initPage(true);
      return true;
    }
    return false;
  }

  keyValues(pairs) {
    if (!pairs || !pairs.length) return this;

    const totalW = this.contentWidth;
    const cardH = 34;
    this._ensureSpace(cardH + 12);

    const cols = Math.min(pairs.length, 4);
    const colW = (totalW - (cols - 1) * 8) / cols;

    for (let i = 0; i < cols; i++) {
      const [k, v] = pairs[i];
      const cx = MARGIN.left + i * (colW + 8);

      this._rect(cx, this.y, colW, cardH, '0.96 0.97 0.99', '0.88 0.91 0.95', 0.5);
      this._text(String(k).toUpperCase(), cx + 8, this.y + 13, 7, 'F2', '0.45 0.52 0.62');
      this._text(String(v == null ? '-' : v), cx + 8, this.y + 26, 10.5, 'F2', '0.08 0.35 0.85');
    }

    this.y += cardH + 14;
    return this;
  }

  table(columns, rows, { fontSize = 8.5 } = {}) {
    const totalW = this.contentWidth;

    // Normalize column widths to sum up to 1.0 exactly
    const sumW = columns.reduce((acc, c) => acc + (c.width || 1), 0);
    const cols = columns.map((c) => ({
      ...c,
      w: totalW * ((c.width || 1) / sumW),
    }));

    const drawHeader = () => {
      const hH = 22;
      this._rect(MARGIN.left, this.y, totalW, hH, '0.12 0.16 0.24', '0.08 0.12 0.18', 0.8);

      let curX = MARGIN.left;
      for (const c of cols) {
        this._text(c.label.toUpperCase(), curX + 6, this.y + 14, 7.5, 'F2', '0.92 0.95 1.0');
        curX += c.w;
      }
      this.y += hH;
    };

    // Draw first header
    this._ensureSpace(40);
    drawHeader();

    if (!rows || !rows.length) {
      this._ensureSpace(30);
      this._rect(MARGIN.left, this.y, totalW, 26, '0.98 0.99 1.0', '0.90 0.92 0.95', 0.5);
      this._text('No records found in this dataset.', MARGIN.left + 14, this.y + 16, 9, 'F1', '0.50 0.55 0.65');
      this.y += 32;
      return this;
    }

    const lineHeight = fontSize + 3.5;

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];

      // 1. Calculate wrapped lines and height for every column in this row
      let maxLinesInRow = 1;
      const cellData = cols.map((col) => {
        const val = row[col.key];
        const maxChars = Math.max(4, Math.floor((col.w - 12) / (fontSize * 0.48)));
        const wrapped = wrapCellText(val, maxChars, 2);
        if (wrapped.length > maxLinesInRow) maxLinesInRow = wrapped.length;
        return { val, wrapped, col };
      });

      const rowHeight = Math.max(19, 7 + maxLinesInRow * lineHeight);

      // 2. Check page space - if break, create new page and re-render table header
      if (this.y + rowHeight > this.size.h - MARGIN.bottom) {
        this._initPage(true);
        drawHeader();
      }

      // 3. Row background: Zebra striping
      const isOdd = rIdx % 2 === 1;
      const bgRGB = isOdd ? '0.97 0.98 0.995' : '1 1 1';
      this._rect(MARGIN.left, this.y, totalW, rowHeight, bgRGB);

      // 4. Render cell text
      let curX = MARGIN.left;
      for (const cell of cellData) {
        let textY = this.y + fontSize + 2.5;

        for (let l = 0; l < cell.wrapped.length; l++) {
          const lineStr = cell.wrapped[l];

          // Check if value looks like a status tag
          const isStatusCol = cell.col.key.toLowerCase().includes('status') || cell.col.key.toLowerCase().includes('result') || cell.col.key.toLowerCase().includes('eligib');
          const isHighlight = isStatusCol && (lineStr.toLowerCase().includes('placed') || lineStr.toLowerCase().includes('selected') || lineStr.toLowerCase().includes('approved') || lineStr.toLowerCase().includes('eligible'));
          const isNegative = isStatusCol && (lineStr.toLowerCase().includes('rejected') || lineStr.toLowerCase().includes('blocked') || lineStr.toLowerCase().includes('ineligible'));

          let font = 'F1';
          let textColor = '0.15 0.20 0.30';

          if (isHighlight) {
            textColor = '0.08 0.55 0.28';
            font = 'F2';
          } else if (isNegative) {
            textColor = '0.78 0.18 0.18';
            font = 'F2';
          } else if (cell.col.key.toLowerCase().includes('name') || cell.col.key.toLowerCase().includes('company')) {
            textColor = '0.08 0.12 0.22';
            font = 'F2';
          }

          this._text(lineStr, curX + 6, textY, fontSize, font, textColor);
          textY += lineHeight;
        }

        curX += cell.col.w;
      }

      // 5. Divider line at bottom of row
      this._line(MARGIN.left, this.y + rowHeight, MARGIN.left + totalW, this.y + rowHeight, '0.90 0.92 0.95', 0.5);

      this.y += rowHeight;
    }

    this.y += 12;
    return this;
  }

  build() {
    const totalPages = this.pages.length;

    // Stamp footer on every page
    this.pages.forEach((ops, idx) => {
      const pageNum = idx + 1;

      // Thin footer divider
      ops.push(`0.85 0.88 0.92 RG 0.5 w ${MARGIN.left} 26 m ${(this.size.w - MARGIN.right).toFixed(2)} 26 l S`);

      // Left footer
      ops.push(`BT /F1 7.5 Tf 0.50 0.55 0.65 rg 1 0 0 1 ${MARGIN.left} 15 Tm (${esc(this.footer)}) Tj ET`);

      // Right footer: Page X of Y
      const pageLabel = `Page ${pageNum} of ${totalPages}`;
      const px = this.size.w - MARGIN.right - approxTextWidth(pageLabel, 7.5);
      ops.push(`BT /F2 7.5 Tf 0.40 0.45 0.55 rg 1 0 0 1 ${px.toFixed(2)} 15 Tm (${esc(pageLabel)}) Tj ET`);
    });

    const fontF1 = 3;
    const fontF2 = 4;
    const pageNums = [];
    const contentNums = [];
    for (let i = 0; i < this.pages.length; i++) {
      pageNums.push(5 + i * 2);
      contentNums.push(6 + i * 2);
    }

    const objects = {};
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${this.pages.length} >>`;
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

    this.pages.forEach((ops, i) => {
      const stream = ops.join('\n');
      objects[contentNums[i]] = { stream };
      objects[pageNums[i]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.size.w.toFixed(2)} ${this.size.h.toFixed(2)}] /Resources << /Font << /F1 ${fontF1} 0 R /F2 ${fontF2} 0 R >> >> /Contents ${contentNums[i]} 0 R >>`;
    });

    let out = '%PDF-1.4\n';
    const offsets = {};
    const maxObj = Math.max(...Object.keys(objects).map(Number));

    for (let n = 1; n <= maxObj; n++) {
      const o = objects[n];
      if (o === undefined) continue;
      offsets[n] = out.length;
      if (typeof o === 'string') {
        out += `${n} 0 obj\n${o}\nendobj\n`;
      } else {
        out += `${n} 0 obj\n<< /Length ${Buffer.byteLength(o.stream, 'latin1')} >>\nstream\n${o.stream}\nendstream\nendobj\n`;
      }
    }

    const xrefStart = out.length;
    out += `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
    for (let n = 1; n <= maxObj; n++) {
      out += `${String(offsets[n] || 0).padStart(10, '0')} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return Buffer.from(out, 'latin1');
  }
}

function buildPdf(opts) {
  return new Pdf(opts);
}

module.exports = { Pdf, buildPdf };
