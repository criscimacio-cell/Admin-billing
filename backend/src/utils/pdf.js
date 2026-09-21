import PDFDocument from 'pdfkit';

const PAGE_MARGIN = 36;
const ROW_HEIGHT = 20;
const FONT_SIZE = 8;

/**
 * Streams a simple landscape table PDF straight to the response.
 * Column widths are proportional shares of the printable page width.
 */
export function sendTablePdf(res, filename, { title, subtitle, columns, rows }) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const totalWeight = columns.reduce((sum, c) => sum + (c.weight || 1), 0);
  const colWidths = columns.map((c) => (pageWidth * (c.weight || 1)) / totalWeight);

  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'left' });
  if (subtitle) doc.fontSize(10).font('Helvetica').fillColor('#555').text(subtitle);
  doc.fillColor('#000').moveDown(0.75);

  function drawHeader(y) {
    let x = PAGE_MARGIN;
    doc.font('Helvetica-Bold').fontSize(FONT_SIZE);
    columns.forEach((c, i) => {
      doc.text(c.label, x, y, { width: colWidths[i], ellipsis: true });
      x += colWidths[i];
    });
    doc.moveTo(PAGE_MARGIN, y + ROW_HEIGHT - 4)
      .lineTo(PAGE_MARGIN + pageWidth, y + ROW_HEIGHT - 4)
      .strokeColor('#ccc').stroke();
    return y + ROW_HEIGHT;
  }

  let y = drawHeader(doc.y);
  doc.font('Helvetica').fontSize(FONT_SIZE);

  for (const row of rows) {
    if (y + ROW_HEIGHT > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      y = drawHeader(PAGE_MARGIN);
      doc.font('Helvetica').fontSize(FONT_SIZE);
    }
    let x = PAGE_MARGIN;
    columns.forEach((c, i) => {
      const value = row[c.key];
      doc.text(value === null || value === undefined ? '' : String(value), x, y, {
        width: colWidths[i],
        ellipsis: true,
      });
      x += colWidths[i];
    });
    y += ROW_HEIGHT;
  }

  if (rows.length === 0) {
    doc.fillColor('#888').text('No records for the selected range.', PAGE_MARGIN, y);
  }

  doc.end();
}
