import {
    DocumentPeriodRecord,
    FinancialDocumentRecord
} from "./documents.service";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;

interface PdfPage {
    commands: string[];
}

function cleanPdfText(value: unknown): string {
    return String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function escapePdfText(value: unknown): string {
    return cleanPdfText(value)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function safeFilePart(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
        .slice(0, 70) || "financial-report";
}

function toNumber(value: number | string | null): number | null {
    if (value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(
    value: number | string | null,
    currency: string | null,
    monetary = true
): string {
    const parsed = toNumber(value);
    if (parsed === null) return "Not reported";

    const formatted = new Intl.NumberFormat("en-IE", {
        maximumFractionDigits: 2
    }).format(parsed);

    return monetary && currency ? `${currency} ${formatted}` : formatted;
}

function formatDate(value: string | null): string {
    if (!value) return "Not provided";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en-IE", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
    }).format(date);
}

function wrapText(text: string, maxCharacters: number): string[] {
    const words = cleanPdfText(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        if (word.length > maxCharacters) {
            if (current) {
                lines.push(current);
                current = "";
            }

            for (let index = 0; index < word.length; index += maxCharacters) {
                lines.push(word.slice(index, index + maxCharacters));
            }
            continue;
        }

        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxCharacters) {
            current = candidate;
        } else {
            lines.push(current);
            current = word;
        }
    }

    if (current) lines.push(current);
    return lines.length ? lines : [""];
}

class ReportPdf {
    private readonly pages: PdfPage[] = [];
    private page!: PdfPage;
    private y = MARGIN;

    constructor(private readonly document: FinancialDocumentRecord) {
        this.newPage();
    }

    build(): Buffer {
        this.addHeader();
        this.addOverview();

        for (const period of this.document.periods) {
            this.addPeriod(period);
        }

        this.addFooters();
        return this.serialize();
    }

    private newPage(): void {
        this.page = { commands: [] };
        this.pages.push(this.page);
        this.y = MARGIN;
    }

    private ensureSpace(height: number): void {
        if (this.y + height > PAGE_HEIGHT - 55) {
            this.newPage();
            this.smallLabel(this.document.companyName, MARGIN, this.y, 8);
            this.y += 24;
        }
    }

    private addHeader(): void {
        this.rect(0, 0, PAGE_WIDTH, 116, "0.035 0.122 0.239");
        this.text("SENUS", MARGIN, 41, 10, true, "0.31 0.78 0.97");
        this.text("Financial report export", MARGIN, 68, 22, true, "1 1 1");
        this.text(
            `Generated ${formatDate(new Date().toISOString())}`,
            MARGIN,
            93,
            9,
            false,
            "0.75 0.82 0.89"
        );
        this.y = 145;
    }

    private addOverview(): void {
        const titleLines = wrapText(this.document.reportName, 55);
        this.smallLabel("COMPANY", MARGIN, this.y, 8);
        this.y += 19;
        this.text(this.document.companyName, MARGIN, this.y, 18, true, "0.06 0.12 0.2");
        this.y += 28;

        this.smallLabel("REPORT", MARGIN, this.y, 8);
        this.y += 17;
        for (const line of titleLines) {
            this.text(line, MARGIN, this.y, 12, true, "0.12 0.18 0.25");
            this.y += 16;
        }

        this.y += 10;
        this.rule(this.y);
        this.y += 18;
        this.keyValue("Type", this.document.reportType, MARGIN, this.y);
        this.keyValue("Report date", formatDate(this.document.reportDate), 300, this.y);
        this.y += 32;
        this.keyValue("Currency", this.document.currency ?? "Not identified", MARGIN, this.y);
        this.keyValue("Uploaded", formatDate(this.document.uploadedAt), 300, this.y);
        this.y += 38;
    }

    private addPeriod(period: DocumentPeriodRecord): void {
<<<<<<< HEAD
        this.ensureSpace(226);
=======
        this.ensureSpace(300);
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

        this.rect(MARGIN, this.y, PAGE_WIDTH - MARGIN * 2, 34, "0.925 0.957 0.976");
        this.text(period.periodLabel || period.period, MARGIN + 12, this.y + 21, 12, true, "0.04 0.32 0.53");
        this.text(formatDate(period.periodEnd), 416, this.y + 21, 8, false, "0.28 0.38 0.47");
        this.y += 52;

        const metrics: Array<[string, number | string | null, boolean]> = [
            ["Revenue", period.revenue, true],
            ["Gross profit", period.grossProfit, true],
            ["Operating profit", period.operatingProfit, true],
            ["EBITDA", period.ebitda, true],
            ["Net profit", period.netProfit, true],
            ["Cash", period.cash, true],
            ["Debt", period.debt, true],
            ["Customers", period.customers, false],
<<<<<<< HEAD
            ["Net assets", period.netAssets, true]
=======
            ["Net assets", period.netAssets, true],
            ["Operating cash flow", period.operatingCashFlow, true],
            ["Total assets", period.totalAssets, true],
            ["Total liabilities", period.totalLiabilities, true],
            ["Earnings per share", period.eps, true]
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        ];

        metrics.forEach(([label, value, monetary], index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = column === 0 ? MARGIN : 300;
            const rowY = this.y + row * 31;

            this.keyValue(
                label,
                formatNumber(value, this.document.currency, monetary),
                x,
                rowY
            );
        });

        this.y += Math.ceil(metrics.length / 2) * 31 + 20;
    }

    private keyValue(label: string, value: string, x: number, y: number): void {
        this.smallLabel(label.toUpperCase(), x, y, 7);
        this.text(value, x, y + 14, 10, false, "0.08 0.14 0.21");
    }

    private smallLabel(text: string, x: number, y: number, size: number): void {
        this.text(text, x, y, size, true, "0.35 0.44 0.52");
    }

    private addFooters(): void {
        this.pages.forEach((page, index) => {
            page.commands.push("0.82 0.85 0.88 RG 0.6 w 48 39 m 547 39 l S");
            page.commands.push(
                this.textCommand(
                    `Senus  |  Document ${this.document.documentId}`,
                    MARGIN,
                    817,
                    8,
                    false,
                    "0.42 0.49 0.56"
                )
            );
            page.commands.push(
                this.textCommand(
                    `Page ${index + 1} of ${this.pages.length}`,
                    485,
                    817,
                    8,
                    false,
                    "0.42 0.49 0.56"
                )
            );
        });
    }

    private text(
        value: string,
        x: number,
        top: number,
        size: number,
        bold: boolean,
        colour: string
    ): void {
        this.page.commands.push(
            this.textCommand(value, x, top, size, bold, colour)
        );
    }

    private textCommand(
        value: string,
        x: number,
        top: number,
        size: number,
        bold: boolean,
        colour: string
    ): string {
        const y = PAGE_HEIGHT - top;
        return `BT /${bold ? "F2" : "F1"} ${size} Tf ${colour} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfText(value)}) Tj ET`;
    }

    private rect(
        x: number,
        top: number,
        width: number,
        height: number,
        colour: string
    ): void {
        const y = PAGE_HEIGHT - top - height;
        this.page.commands.push(`${colour} rg ${x} ${y} ${width} ${height} re f`);
    }

    private rule(top: number): void {
        const y = PAGE_HEIGHT - top;
        this.page.commands.push(
            `0.82 0.85 0.88 RG 0.8 w ${MARGIN} ${y} m ${PAGE_WIDTH - MARGIN} ${y} l S`
        );
    }

    private serialize(): Buffer {
        const objects: string[] = [];
        const pageReferences = this.pages.map((_, index) => `${5 + index * 2} 0 R`);

        objects.push("<< /Type /Catalog /Pages 2 0 R >>");
        objects.push(
            `<< /Type /Pages /Kids [${pageReferences.join(" ")}] /Count ${this.pages.length} >>`
        );
        objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

        this.pages.forEach((page, index) => {
            const contentId = 6 + index * 2;
            const stream = page.commands.join("\n");
            const streamLength = Buffer.byteLength(stream, "latin1");

            objects.push(
                `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
            );
            objects.push(`<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`);
        });

        let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        const offsets = [0];

        objects.forEach((object, index) => {
            offsets.push(Buffer.byteLength(output, "latin1"));
            output += `${index + 1} 0 obj\n${object}\nendobj\n`;
        });

        const xrefOffset = Buffer.byteLength(output, "latin1");
        output += `xref\n0 ${objects.length + 1}\n`;
        output += "0000000000 65535 f \n";
        output += offsets
            .slice(1)
            .map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`)
            .join("");
        output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
        output += `startxref\n${xrefOffset}\n%%EOF\n`;

        return Buffer.from(output, "latin1");
    }
}

function csvCell(value: unknown): string {
    let text = String(value ?? "");

    // Prevent spreadsheet applications from treating untrusted AI text as a formula.
    if (/^[=+\-@\t\r]/.test(text)) {
        text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
}

export function createReportPdf(
    document: FinancialDocumentRecord
): Buffer {
    return new ReportPdf(document).build();
}

export function createReportCsv(
    document: FinancialDocumentRecord
): string {
    const headers = [
        "Company",
        "Report",
        "Report type",
        "Currency",
        "Period",
        "Period label",
        "Period end",
        "Revenue",
        "Gross profit",
        "Operating profit",
        "EBITDA",
        "Net profit",
        "Cash",
        "Debt",
        "Customers",
<<<<<<< HEAD
        "Net assets"
=======
        "Net assets",
        "Operating cash flow",
        "Total assets",
        "Total liabilities",
        "EPS"
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    ];

    const rows = document.periods.map(period => [
        document.companyName,
        document.reportName,
        document.reportType,
        document.currency,
        period.period,
        period.periodLabel,
        period.periodEnd,
        period.revenue,
        period.grossProfit,
        period.operatingProfit,
        period.ebitda,
        period.netProfit,
        period.cash,
        period.debt,
        period.customers,
<<<<<<< HEAD
        period.netAssets
=======
        period.netAssets,
        period.operatingCashFlow,
        period.totalAssets,
        period.totalLiabilities,
        period.eps
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
    ]);

    return [headers, ...rows]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n") + "\r\n";
}

export function createReportJson(
    document: FinancialDocumentRecord
): string {
    return JSON.stringify({
        schemaVersion: "1.0",
        exportedAt: new Date().toISOString(),
        report: {
            company: document.companyName,
            reportName: document.reportName,
            reportType: document.reportType,
            reportDate: document.reportDate,
            currency: document.currency,
            source: document.source,
            uploadedAt: document.uploadedAt,
            periods: document.periods.map(period => ({
                period: period.period,
                periodLabel: period.periodLabel,
                periodEnd: period.periodEnd,
                revenue: toNumber(period.revenue),
                grossProfit: toNumber(period.grossProfit),
                operatingProfit: toNumber(period.operatingProfit),
                ebitda: toNumber(period.ebitda),
                netProfit: toNumber(period.netProfit),
                cash: toNumber(period.cash),
                debt: toNumber(period.debt),
                customers: toNumber(period.customers),
<<<<<<< HEAD
                netAssets: toNumber(period.netAssets)
=======
                netAssets: toNumber(period.netAssets),
                operatingCashFlow: toNumber(period.operatingCashFlow),
                totalAssets: toNumber(period.totalAssets),
                totalLiabilities: toNumber(period.totalLiabilities),
                eps: toNumber(period.eps)
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
            }))
        }
    }, null, 2) + "\n";
}

export function getReportExportFilename(
    document: FinancialDocumentRecord,
    extension: "pdf" | "csv" | "json"
): string {
    return `${safeFilePart(document.companyName)}-${safeFilePart(document.reportName)}.${extension}`;
}
