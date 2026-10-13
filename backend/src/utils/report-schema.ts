<<<<<<< HEAD
import { REPORT_TYPES } from "./report-validator";
=======
import { DOCUMENT_TYPES, REPORT_TYPES } from "./report-validator";
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)

const nullableNumber = { type: ["number", "null"] };
const nullableDate = {
    anyOf: [
        { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        { type: "null" }
    ]
};

export const financialReportSchema = {
    type: "object",
    additionalProperties: false,
    required: [
<<<<<<< HEAD
=======
        "classification",
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        "company",
        "reportName",
        "reportType",
        "reportDate",
        "currency",
        "source",
        "periods"
    ],
    properties: {
<<<<<<< HEAD
=======
        classification: {
            type: "object",
            additionalProperties: false,
            required: ["isFinancialReport", "documentType", "confidence", "reason"],
            properties: {
                isFinancialReport: { type: "boolean" },
                documentType: { type: "string", enum: [...DOCUMENT_TYPES] },
                confidence: { type: "number" },
                reason: { type: "string" }
            }
        },
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
        company: { type: "string" },
        reportName: { type: "string" },
        reportType: { type: "string", enum: [...REPORT_TYPES] },
        reportDate: nullableDate,
        currency: {
            anyOf: [
                { type: "string", pattern: "^[A-Z]{3}$" },
                { type: "null" }
            ]
        },
        source: { type: ["string", "null"] },
        periods: {
            type: "array",
<<<<<<< HEAD
            minItems: 1,
=======
            minItems: 0,
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
            maxItems: 40,
            items: {
                type: "object",
                additionalProperties: false,
                required: [
                    "period",
                    "periodEnd",
                    "periodLabel",
                    "revenue",
                    "grossProfit",
                    "operatingProfit",
                    "ebitda",
                    "netProfit",
                    "cash",
                    "debt",
                    "customers",
<<<<<<< HEAD
                    "netAssets"
=======
                    "netAssets",
                    "operatingCashFlow",
                    "totalAssets",
                    "totalLiabilities",
                    "eps"
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
                ],
                properties: {
                    period: {
                        type: "string",
                        pattern: "^(?:FY\\d{4}|(?:Q[1-4]|H[12]|YTD|M(?:3|6|9|12))_\\d{4})$"
                    },
                    periodEnd: nullableDate,
                    periodLabel: { type: "string" },
                    revenue: nullableNumber,
                    grossProfit: nullableNumber,
                    operatingProfit: nullableNumber,
                    ebitda: nullableNumber,
                    netProfit: nullableNumber,
                    cash: nullableNumber,
                    debt: nullableNumber,
                    customers: nullableNumber,
<<<<<<< HEAD
                    netAssets: nullableNumber
=======
                    netAssets: nullableNumber,
                    operatingCashFlow: nullableNumber,
                    totalAssets: nullableNumber,
                    totalLiabilities: nullableNumber,
                    eps: nullableNumber
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
                }
            }
        }
    }
};
