import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  scale?: number;
}

/**
 * Prints any HTML element by ID cleanly using an isolated hidden iframe.
 */
export function printElement(elementId: string, options?: { title?: string }): boolean {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`[printElement] Element with ID "${elementId}" not found. Falling back to window.print().`);
      window.print();
      return false;
    }

    // Reuse or create a hidden print iframe
    let iframe = document.getElementById('app-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'app-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return false;
    }

    // Copy all page style elements and links
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    const documentTitle = options?.title || 'Print Document';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${documentTitle}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            *, *::before, *::after {
              box-sizing: border-box;
            }
            body {
              background-color: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, [no-print] {
              display: none !important;
            }
            #${elementId} {
              box-shadow: none !important;
              border: none !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          </style>
        </head>
        <body>
          <div style="padding: 12px;">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('[printElement] Iframe print trigger error:', err);
        window.print();
      }
    }, 300);

    return true;
  } catch (err) {
    console.error('[printElement] Error executing element print:', err);
    window.print();
    return false;
  }
}

/**
 * Captures any HTML element by ID or ref and converts it to a downloadable PDF file.
 */
export async function downloadElementAsPDF(
  elementOrId: string | HTMLElement,
  filename: string,
  options?: PDFExportOptions
): Promise<boolean> {
  try {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!element) {
      console.warn(`[pdfGenerator] Element with ID or ref "${elementOrId}" not found. Falling back to browser print.`);
      window.print();
      return false;
    }

    // Capture element into Canvas
    const canvas = await html2canvas(element, {
      scale: options?.scale || 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth || 1200,
      ignoreElements: (el) => el.classList.contains('no-print') || el.classList.contains('no-pdf'),
    });

    const imgData = canvas.toDataURL('image/png');
    const orientation = options?.orientation || (canvas.width > canvas.height * 1.2 ? 'landscape' : 'portrait');
    
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
    return true;
  } catch (err) {
    console.error('[pdfGenerator] Error exporting PDF:', err);
    window.print();
    return false;
  }
}

export interface StructuredPDFData {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  filename: string;
  companyName?: string;
}

/**
 * Generates a clean tabular PDF report directly from structured JSON data.
 */
export function downloadReportDataAsPDF(data: StructuredPDFData): void {
  const { title, subtitle, headers, rows, filename, companyName = 'ARCENOL ERP - LITHIUM INDUSTRIAL' } = data;
  
  const isLandscape = headers.length > 5;
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 16;

  // Header Banner
  pdf.setFillColor(15, 23, 42); // Navy Dark
  pdf.rect(0, 0, pageWidth, 22, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text(companyName, 14, 12);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(203, 213, 225);
  pdf.text(`ISO 9001:2025 Certified · Confidential Report`, 14, 17);

  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 14, { align: 'right' });

  y = 30;

  // Report Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(15, 23, 42);
  pdf.text(title.toUpperCase(), 14, y);

  if (subtitle) {
    y += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(subtitle, 14, y);
  }

  y += 10;

  // Table Configuration
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = usableWidth / Math.max(1, headers.length);

  // Table Header
  pdf.setFillColor(6, 182, 212); // Cyan Accent
  pdf.rect(margin, y - 4, usableWidth, 8, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);

  headers.forEach((h, i) => {
    pdf.text(String(h).toUpperCase(), margin + i * colWidth + 2, y + 1);
  });

  y += 8;

  // Table Rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);

  rows.forEach((row, rowIndex) => {
    if (y > pageHeight - 20) {
      pdf.addPage();
      y = 20;

      // Repeat Table Header on new page
      pdf.setFillColor(6, 182, 212);
      pdf.rect(margin, y - 4, usableWidth, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(255, 255, 255);
      headers.forEach((h, i) => {
        pdf.text(String(h).toUpperCase(), margin + i * colWidth + 2, y + 1);
      });
      y += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(30, 41, 59);
    }

    if (rowIndex % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y - 4, usableWidth, 7, 'F');
    }

    row.forEach((cell, i) => {
      const text = String(cell ?? '');
      const maxChars = Math.floor(colWidth / 2.5);
      const truncated = text.length > maxChars ? text.slice(0, maxChars - 2) + '..' : text;
      pdf.text(truncated, margin + i * colWidth + 2, y + 0.5);
    });

    y += 7;
  });

  // Footer / Page numbers
  const totalPages = (pdf.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${i} of ${totalPages} · Arcenol ERP Industrial Suite`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}
