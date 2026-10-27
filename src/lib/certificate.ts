import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import { formatIST } from '@/lib/format';

/*
 * The participation certificate: one A4 landscape page in the site's look
 * (canvas, a white sheet, ink type, the marker under the name, campus blue
 * for the spoken phrase) with a QR code to the public check page, so anyone
 * reading a resume can confirm it is real.
 *
 * pdf-lib's built-in fonts only draw Latin-1 (WinAnsi). Anything else (₹, an
 * Indic script) would throw, so text is reduced to what the font can draw.
 */

// The globals.css tokens, as PDF colours.
const INK = rgb(0x11 / 255, 0x11 / 255, 0x14 / 255);
const CANVAS = rgb(0xf5 / 255, 0xf4 / 255, 0xf0 / 255);
const PAPER = rgb(1, 1, 1);
const FELT = rgb(0x5f / 255, 0x5f / 255, 0x68 / 255);
const ASH = rgb(0x6c / 255, 0x6c / 255, 0x75 / 255);
const ACCENT = rgb(0x2f / 255, 0x3b / 255, 0xff / 255);
const MARKER = rgb(0xff / 255, 0xe4 / 255, 0x5c / 255);
const HAIRLINE = rgb(0xe2 / 255, 0xe0 / 255, 0xd8 / 255);

export type CertificateDetails = {
    name: string;
    eventTitle: string;
    host: string;
    college: string;
    date: Date;
    checkedInAt: Date;
    verifyUrl: string;
    code: string;
};

/** The text with every character the font cannot draw removed. */
function drawable(font: PDFFont, text: string) {
    let out = '';
    for (const ch of text.normalize('NFC')) {
        try {
            font.encodeText(ch);
            out += ch;
        } catch {
            // Not in WinAnsi: drop it rather than fail the whole certificate.
        }
    }
    return out.replace(/\s+/g, ' ').trim();
}

/** The largest size (down to `min`) at which the text fits `width`. */
function fitSize(font: PDFFont, text: string, max: number, min: number, width: number) {
    let size = max;
    while (size > min && font.widthOfTextAtSize(text, size) > width) size -= 1;
    return size;
}

/** Up to `maxLines` lines no wider than `width`, the last one cut with an ellipsis if needed. */
function wrap(font: PDFFont, text: string, size: number, width: number, maxLines: number) {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) {
            line = next;
            continue;
        }
        if (line) lines.push(line);
        line = word;
        if (lines.length === maxLines) break;
    }
    if (line && lines.length < maxLines) lines.push(line);
    const used = lines.join(' ').length;
    if (used < text.length && lines.length) {
        let last = lines[lines.length - 1];
        while (last && font.widthOfTextAtSize(`${last}...`, size) > width) last = last.slice(0, -1);
        lines[lines.length - 1] = `${last.trimEnd()}...`;
    }
    return lines;
}

function centred(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK) {
    const { width } = page.getSize();
    page.drawText(text, { x: (width - font.widthOfTextAtSize(text, size)) / 2, y, font, size, color });
}

export async function certificatePdf(details: CertificateDetails) {
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Certificate of participation: ${details.eventTitle}`);
    pdf.setAuthor('Campus Connect');
    pdf.setCreator('Campus Connect');

    const page = pdf.addPage([842, 595]); // A4 landscape, in points
    const { width, height } = page.getSize();
    const [sans, sansBold, serifItalic, mono] = await Promise.all([
        pdf.embedFont(StandardFonts.Helvetica),
        pdf.embedFont(StandardFonts.HelveticaBold),
        pdf.embedFont(StandardFonts.TimesRomanItalic),
        pdf.embedFont(StandardFonts.Courier),
    ]);

    // The board, then the sheet pinned to it.
    page.drawRectangle({ x: 0, y: 0, width, height, color: CANVAS });
    page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, color: PAPER, borderColor: HAIRLINE, borderWidth: 1 });

    // Masthead: the mark and the name, and what this is.
    page.drawRectangle({ x: 60, y: height - 92, width: 26, height: 26, color: INK });
    page.drawCircle({ x: 68, y: height - 75, size: 3.2, color: MARKER });
    page.drawCircle({ x: 78, y: height - 83, size: 3.2, color: MARKER });
    page.drawText('Campus Connect', { x: 96, y: height - 85, font: sansBold, size: 14, color: INK });
    const kicker = 'CERTIFICATE OF PARTICIPATION';
    page.drawText(kicker, { x: width - 60 - mono.widthOfTextAtSize(kicker, 9), y: height - 84, font: mono, size: 9, color: ASH });

    // The certificate itself.
    const name = drawable(sansBold, details.name) || 'Participant';
    const title = drawable(sansBold, details.eventTitle) || 'An event on Campus Connect';
    const host = drawable(sans, details.host);
    const college = drawable(sans, details.college);

    centred(page, 'This certifies that', height - 178, serifItalic, 20, FELT);

    const nameSize = fitSize(sansBold, name, 46, 24, width - 200);
    const nameY = height - 240;
    const nameWidth = sansBold.widthOfTextAtSize(name, nameSize);
    // The marker, once on the page: a highlighter stroke under the name.
    page.drawRectangle({ x: (width - nameWidth) / 2 - 8, y: nameY - 8, width: nameWidth + 16, height: nameSize * 0.42, color: MARKER });
    centred(page, name, nameY, sansBold, nameSize);

    centred(page, 'took part in', height - 292, serifItalic, 20, ACCENT);

    const titleSize = fitSize(sansBold, title, 28, 20, width - 200);
    const titleLines = wrap(sansBold, title, titleSize, width - 200, 2);
    titleLines.forEach((line, i) => centred(page, line, height - 336 - i * (titleSize + 6), sansBold, titleSize));

    const when = formatIST(details.date, { day: 'numeric', month: 'long', year: 'numeric' });
    const hosted = drawable(sans, [host && `Hosted by ${host}`, college && `at ${college}`, `on ${when}`].filter(Boolean).join(' '));
    centred(page, hosted, height - 336 - titleLines.length * (titleSize + 6) - 8, sans, 12, FELT);

    // Proof: when they were checked in, and where anyone can confirm it.
    page.drawLine({ start: { x: 60, y: 132 }, end: { x: width - 170, y: 132 }, thickness: 1, color: HAIRLINE });
    const checkedIn = `Checked in at the door on ${formatIST(details.checkedInAt, { day: 'numeric', month: 'short', year: 'numeric' })}, ${formatIST(details.checkedInAt, { hour: 'numeric', minute: '2-digit' })}`;
    page.drawText(drawable(sans, checkedIn), { x: 60, y: 104, font: sans, size: 10, color: FELT });
    page.drawText('CHECK THIS CERTIFICATE', { x: 60, y: 82, font: mono, size: 8, color: ASH });
    page.drawText(drawable(mono, details.verifyUrl), { x: 60, y: 68, font: mono, size: 8, color: INK });
    page.drawText(`CODE ${details.code}`, { x: 60, y: 54, font: mono, size: 8, color: ASH });

    const qr = await QRCode.toBuffer(details.verifyUrl, { type: 'png', margin: 0, width: 240, errorCorrectionLevel: 'M' });
    const qrImage = await pdf.embedPng(qr);
    page.drawImage(qrImage, { x: width - 150, y: 48, width: 90, height: 90 });

    return pdf.save();
}
