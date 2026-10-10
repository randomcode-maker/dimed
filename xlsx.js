/*
 * Tiny dependency-free .xlsx writer for Dimed Stats.
 * Produces a real Excel workbook (zip container, STORE method) that opens in
 * Excel, Numbers, and Google Sheets.
 *
 * Usage: DimedXLSX.build([{ name, rows, cols }]) -> Blob
 *   rows: array of arrays (strings / numbers / null). First row is the header.
 *   cols: optional array of { w: width, s: 'text' | 'dec3' | 'dec2' } per column.
 */
(function (global) {
  'use strict';

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  var enc = new TextEncoder();
  function u16(n) { return [n & 255, (n >>> 8) & 255]; }
  function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }

  function zip(files) {
    var chunks = [];
    var central = [];
    var offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name);
      var data = enc.encode(f.text);
      var crc = crc32(data);
      var local = new Uint8Array([0x50, 0x4b, 3, 4].concat(
        u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0)
      ));
      chunks.push(local, name, data);
      central.push({ name: name, crc: crc, size: data.length, offset: offset });
      offset += local.length + name.length + data.length;
    });
    var cdStart = offset;
    central.forEach(function (c) {
      var h = new Uint8Array([0x50, 0x4b, 1, 2].concat(
        u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(c.crc), u32(c.size), u32(c.size), u16(c.name.length),
        u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.offset)
      ));
      chunks.push(h, c.name);
      offset += h.length + c.name.length;
    });
    var cdSize = offset - cdStart;
    chunks.push(new Uint8Array([0x50, 0x4b, 5, 6].concat(
      u16(0), u16(0), u16(central.length), u16(central.length),
      u32(cdSize), u32(cdStart), u16(0)
    )));
    return new Blob(chunks, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function esc(s) {
    return String(s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function colName(i) {
    var s = '';
    i++;
    while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  var STYLE_IDX = { text: 0, header: 1, dec3: 2, dec2: 3 };

  function sheetXml(sheet) {
    var cols = sheet.cols || [];
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>';
    if (cols.length) {
      xml += '<cols>';
      cols.forEach(function (c, i) {
        xml += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.w || 10) + '" customWidth="1"/>';
      });
      xml += '</cols>';
    }
    xml += '<sheetData>';
    sheet.rows.forEach(function (row, r) {
      xml += '<row r="' + (r + 1) + '">';
      row.forEach(function (val, c) {
        if (val === null || val === undefined || val === '') return;
        var ref = colName(c) + (r + 1);
        var styleKey = r === 0 ? 'header' : ((cols[c] && cols[c].s) || 'text');
        var s = STYLE_IDX[styleKey] || 0;
        if (typeof val === 'number' && isFinite(val)) {
          xml += '<c r="' + ref + '" s="' + s + '"><v>' + val + '</v></c>';
        } else {
          xml += '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + esc(val) + '</t></is></c>';
        }
      });
      xml += '</row>';
    });
    xml += '</sheetData></worksheet>';
    return xml;
  }

  var STYLES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode=".000"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF3D2BD6"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="4">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function safeName(name, used) {
    var base = String(name).replace(/[\[\]:*?\/\\]/g, '-').slice(0, 31) || 'Sheet';
    var out = base, n = 2;
    while (used[out.toLowerCase()]) {
      var suffix = ' (' + n++ + ')';
      out = base.slice(0, 31 - suffix.length) + suffix;
    }
    used[out.toLowerCase()] = true;
    return out;
  }

  function build(sheets) {
    var used = {};
    var names = sheets.map(function (s) { return safeName(s.name, used); });
    var files = [];

    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    sheets.forEach(function (_, i) {
      ct += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    });
    ct += '</Types>';
    files.push({ name: '[Content_Types].xml', text: ct });

    files.push({
      name: '_rels/.rels',
      text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    });

    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    names.forEach(function (n, i) {
      wb += '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
    });
    wb += '</sheets></workbook>';
    files.push({ name: 'xl/workbook.xml', text: wb });

    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    sheets.forEach(function (_, i) {
      rels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    });
    rels += '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    rels += '</Relationships>';
    files.push({ name: 'xl/_rels/workbook.xml.rels', text: rels });
    files.push({ name: 'xl/styles.xml', text: STYLES });

    sheets.forEach(function (s, i) {
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', text: sheetXml(s) });
    });

    return zip(files);
  }

  global.DimedXLSX = { build: build };
})(window);
