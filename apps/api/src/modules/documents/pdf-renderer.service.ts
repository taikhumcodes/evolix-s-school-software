import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  LayoutDefinition,
  LayoutElement,
  PageSettings,
} from './documents.types.js';
import { TemplateLayoutEngine } from './template-layout.engine.js';

export interface RenderResult {
  pdfBuffer: Buffer;
  pageCount: number;
  checksumSha256: string;
}

export class PdfRendererService {
  private static devanagariFontPath: string | null = null;

  static {
    // Detect system font for Hindi / Devanagari script support
    const candidates = [
      'C:/Windows/Fonts/mangal.ttf',
      'C:/Windows/Fonts/aparaj.ttf',
      'C:/Windows/Fonts/nirmala.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/opentype/noto/NotoSansDevanagari-Regular.ttf',
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.devanagariFontPath = p;
        break;
      }
    }
  }

  /**
   * Detects if string contains Devanagari unicode characters.
   */
  private static containsDevanagari(text: string): boolean {
    return /[\u0900-\u097F]/.test(text);
  }

  /**
   * Resolves paper dimensions in points (1 inch = 72 points).
   */
  private static getPageDimensions(
    pageSize: string,
    orientation: 'PORTRAIT' | 'LANDSCAPE'
  ): [number, number] {
    let dims: [number, number] = [595.28, 841.89]; // Default A4 portrait
    switch (pageSize.toUpperCase()) {
      case 'A3':
        dims = [841.89, 1190.55];
        break;
      case 'A4':
        dims = [595.28, 841.89];
        break;
      case 'LETTER':
        dims = [612.0, 792.0];
        break;
      case 'LEGAL':
        dims = [612.0, 1008.0];
        break;
      case 'CARD_CR80':
        dims = [242.65, 153.07]; // 85.6mm x 53.98mm
        break;
    }

    if (orientation === 'LANDSCAPE') {
      return [dims[1], dims[0]];
    }
    return dims;
  }

  /**
   * Main PDF render pipeline.
   */
  public static async renderPdf(
    layout: LayoutDefinition,
    pageSettings: PageSettings,
    data: Record<string, any>,
    qrVerificationUrl?: string
  ): Promise<RenderResult> {
    const validatedLayout = TemplateLayoutEngine.validateLayout(layout);
    const [pageWidth, pageHeight] = this.getPageDimensions(
      pageSettings.pageSize,
      pageSettings.orientation
    );

    const margins = validatedLayout.margins || { top: 36, bottom: 36, left: 36, right: 36 };

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [pageWidth, pageHeight],
          margins: {
            top: margins.top,
            bottom: margins.bottom,
            left: margins.left,
            right: margins.right,
          },
          autoFirstPage: true,
          bufferPages: true,
        });

        // Register custom Devanagari font if available
        if (this.devanagariFontPath) {
          doc.registerFont('Devanagari', this.devanagariFontPath);
        }

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          const range = doc.bufferedPageRange();
          const pageCount = range && range.count > 0 ? range.count : 1;
          const checksumSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

          resolve({
            pdfBuffer,
            pageCount,
            checksumSha256,
          });
        });

        const printableWidth = pageWidth - margins.left - margins.right;

        // Render document elements
        for (const element of validatedLayout.elements) {
          if (!TemplateLayoutEngine.evaluateCondition(element.condition, data)) {
            continue;
          }
          await this.renderElement(doc, element, data, printableWidth, margins, qrVerificationUrl);
        }

        // Apply watermark and page footers across all buffered pages
        const range = doc.bufferedPageRange();
        const totalPages = range ? range.count : 1;

        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);

          // Watermark
          if (validatedLayout.watermark?.text) {
            const wm = validatedLayout.watermark;
            doc.save();
            doc.fillColor(wm.color || '#94a3b8');
            doc.fillOpacity(wm.opacity || 0.1);
            doc.fontSize(wm.fontSize || 50);
            doc.rotate(wm.angle || -45, { origin: [pageWidth / 2, pageHeight / 2] });
            doc.text(wm.text, 0, pageHeight / 2 - 30, {
              align: 'center',
              width: pageWidth,
            });
            doc.restore();
          }

          // Footer
          if (validatedLayout.footer?.elements) {
            const footerY = pageHeight - margins.bottom - 20;
            doc.save();
            for (const fEl of validatedLayout.footer.elements) {
              if (fEl.type === 'TEXT') {
                const text = TemplateLayoutEngine.interpolateString(fEl.content || '', {
                  ...data,
                  pageNumber: i + 1,
                  totalPages,
                });
                doc.fontSize(fEl.style?.fontSize || 9);
                doc.fillColor(fEl.style?.color || '#64748b');
                doc.text(text, margins.left, footerY, {
                  width: printableWidth,
                  align: fEl.style?.alignment || 'center',
                });
              }
            }
            doc.restore();
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Renders individual layout element.
   */
  private static async renderElement(
    doc: PDFKit.PDFDocument,
    element: LayoutElement,
    data: Record<string, any>,
    printableWidth: number,
    margins: { top: number; bottom: number; left: number; right: number },
    qrVerificationUrl?: string
  ): Promise<void> {
    const style = element.style || {};

    // Margin top
    if (style.marginTop) {
      doc.y += style.marginTop;
    }

    switch (element.type) {
      case 'PAGE_BREAK': {
        doc.addPage();
        break;
      }

      case 'LINE': {
        const lineY = doc.y;
        doc.save();
        doc.strokeColor(style.borderColor || style.color || '#cbd5e1');
        doc.lineWidth(style.lineWidth || 1);
        doc.moveTo(margins.left, lineY).lineTo(margins.left + printableWidth, lineY).stroke();
        doc.restore();
        doc.y = lineY + (style.marginBottom || 10);
        break;
      }

      case 'TEXT':
      case 'PARAGRAPH': {
        const rawContent = element.content || '';
        const interpolated = TemplateLayoutEngine.interpolateString(rawContent, data);

        doc.save();
        if (this.containsDevanagari(interpolated) && this.devanagariFontPath) {
          doc.font('Devanagari');
        } else if (style.bold && style.italic) {
          doc.font('Helvetica-BoldOblique');
        } else if (style.bold) {
          doc.font('Helvetica-Bold');
        } else if (style.italic) {
          doc.font('Helvetica-Oblique');
        } else {
          doc.font('Helvetica');
        }

        doc.fontSize(style.fontSize || (element.type === 'PARAGRAPH' ? 11 : 12));
        doc.fillColor(style.color || '#0f172a');

        const lineGap = style.lineHeight ? (style.lineHeight - 1) * (style.fontSize || 11) : 2;

        doc.text(interpolated, {
          width: style.width || printableWidth,
          align: style.alignment || 'left',
          lineGap,
          underline: Boolean(style.underline),
        });

        doc.restore();
        break;
      }

      case 'ROW': {
        if (!element.children || element.children.length === 0) break;
        const rowY = doc.y;
        const colWidth = (printableWidth - (element.children.length - 1) * 10) / element.children.length;
        let maxHeight = 0;

        for (let idx = 0; idx < element.children.length; idx++) {
          const child = element.children[idx];
          const colX = margins.left + idx * (colWidth + 10);
          doc.x = colX;
          doc.y = rowY;

          await this.renderElement(
            doc,
            { ...child, style: { ...child.style, width: colWidth } },
            data,
            colWidth,
            margins,
            qrVerificationUrl
          );

          const childHeight = doc.y - rowY;
          if (childHeight > maxHeight) {
            maxHeight = childHeight;
          }
        }

        doc.x = margins.left;
        doc.y = rowY + maxHeight;
        break;
      }

      case 'TABLE': {
        const columns = element.columns || [];
        if (columns.length === 0) break;

        const sourcePath = element.source || '';
        const rows: any[] = TemplateLayoutEngine.getSafeValue(data, sourcePath) || [];

        const startY = doc.y;
        const totalColWidthSpecified = columns.reduce((acc: number, c: any) => acc + (c.width || 0), 0);
        const remainingWidth = Math.max(0, printableWidth - totalColWidthSpecified);
        const unspecifiedCount = columns.filter((c: any) => !c.width).length;
        const defaultColWidth = unspecifiedCount > 0 ? remainingWidth / unspecifiedCount : 100;

        const colWidths = columns.map((c: any) => c.width || defaultColWidth);

        // Header
        doc.save();
        doc.rect(margins.left, doc.y, printableWidth, 22).fill('#f1f5f9');
        doc.fillColor('#1e293b');
        doc.font('Helvetica-Bold').fontSize(9);

        let currX = margins.left;
        const headerY = doc.y + 6;
        columns.forEach((col: any, idx: number) => {
          doc.text(col.header, currX + 4, headerY, {
            width: colWidths[idx] - 8,
            align: col.align || 'left',
          });
          currX += colWidths[idx];
        });
        doc.restore();

        doc.y = headerY + 16;

        // Data Rows
        doc.font('Helvetica').fontSize(9);
        rows.forEach((row: any, rowIdx: number) => {
          const rowBg = rowIdx % 2 === 1 ? '#f8fafc' : '#ffffff';
          const rY = doc.y;

          doc.save();
          doc.rect(margins.left, rY, printableWidth, 18).fill(rowBg);
          doc.fillColor('#334155');

          let cellX = margins.left;
          columns.forEach((col: any, colIdx: number) => {
            const rawVal = row[col.key] !== undefined ? row[col.key] : '';
            const cellText = String(rawVal);

            doc.text(cellText, cellX + 4, rY + 4, {
              width: colWidths[colIdx] - 8,
              align: col.align || 'left',
            });
            cellX += colWidths[colIdx];
          });
          doc.restore();
          doc.y = rY + 18;
        });

        // Bottom border
        doc.save();
        doc.strokeColor('#cbd5e1').lineWidth(0.5);
        doc.moveTo(margins.left, doc.y).lineTo(margins.left + printableWidth, doc.y).stroke();
        doc.restore();
        break;
      }

      case 'IMAGE':
      case 'SIGNATURE':
      case 'STAMP': {
        const rawSource = element.source || '';
        const resolvedSource = TemplateLayoutEngine.interpolateString(rawSource, data);

        if (resolvedSource) {
          try {
            let imgBuffer: Buffer | null = null;

            if (resolvedSource.startsWith('data:image')) {
              const base64Data = resolvedSource.split(',')[1];
              if (base64Data) {
                imgBuffer = Buffer.from(base64Data, 'base64');
              }
            } else if (fs.existsSync(resolvedSource)) {
              imgBuffer = fs.readFileSync(resolvedSource);
            }

            if (imgBuffer) {
              const imgW = style.width || 100;
              const imgH = style.height || 100;
              let imgX = doc.x;

              if (style.alignment === 'center') {
                imgX = margins.left + (printableWidth - imgW) / 2;
              } else if (style.alignment === 'right') {
                imgX = margins.left + printableWidth - imgW;
              }

              doc.image(imgBuffer, imgX, doc.y, {
                width: imgW,
                height: imgH,
              });
              doc.y += imgH;
            }
          } catch (e) {
            // Silently fallback if image failed to load
          }
        }
        break;
      }

      case 'QR_CODE': {
        const qrContent = qrVerificationUrl || TemplateLayoutEngine.interpolateString(element.content || '{{verificationUrl}}', data);

        if (qrContent) {
          try {
            const qrSize = style.width || style.height || 70;
            const qrBuffer = await QRCode.toBuffer(qrContent, {
              width: qrSize * 2,
              margin: 1,
              errorCorrectionLevel: 'M',
            });

            let qrX = doc.x;
            if (style.alignment === 'center') {
              qrX = margins.left + (printableWidth - qrSize) / 2;
            } else if (style.alignment === 'right') {
              qrX = margins.left + printableWidth - qrSize;
            }

            doc.image(qrBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
            doc.y += qrSize;
          } catch (e) {
            // Fallback
          }
        }
        break;
      }
    }

    // Margin bottom
    if (style.marginBottom) {
      doc.y += style.marginBottom;
    }
  }
}
