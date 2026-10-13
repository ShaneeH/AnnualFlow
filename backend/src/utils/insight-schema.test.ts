import assert from "node:assert/strict";
import test from "node:test";

import { ReportValidationError } from "./errors";
import { parseAndValidateInsight } from "./insight-schema";

const validInsight = {
    performanceSummary: "Revenue reached 1.8bn with a 22.78% operating margin.",
    marketFactors: ["Demand for live events may have supported revenue."],
    economicPoliticalFactors: ["Consumer spending could be sensitive to interest rates."],
    socialFactors: ["Shifts to streaming may influence audience reach."],
    improvements: ["Converting more operating profit to cash would strengthen liquidity."],
    risks: ["Debt of 420m is worth watching relative to cash of 650m."]
};

test("accepts and normalises a valid insight", () => {
    const insight = parseAndValidateInsight(JSON.stringify({
        ...validInsight,
        performanceSummary: "  Revenue   reached\n1.8bn.  "
    }));

    assert.equal(insight.performanceSummary, "Revenue reached 1.8bn.");
    assert.equal(insight.risks.length, 1);
});

test("rejects invalid JSON and non-objects", () => {
    assert.throws(() => parseAndValidateInsight("not json"), ReportValidationError);
    assert.throws(() => parseAndValidateInsight("[]"), ReportValidationError);
});

test("rejects unknown fields", () => {
    assert.throws(
        () => parseAndValidateInsight(JSON.stringify({ ...validInsight, buyRating: "strong buy" })),
        /unexpected field 'buyRating'/
    );
});

test("rejects missing, empty or oversized sections", () => {
    const { risks: _risks, ...missing } = validInsight;
    assert.throws(() => parseAndValidateInsight(JSON.stringify(missing)), ReportValidationError);
    assert.throws(
        () => parseAndValidateInsight(JSON.stringify({ ...validInsight, risks: [] })),
        ReportValidationError
    );
    assert.throws(
        () => parseAndValidateInsight(JSON.stringify({ ...validInsight, risks: Array(6).fill("x") })),
        ReportValidationError
    );
    assert.throws(
        () => parseAndValidateInsight(JSON.stringify({ ...validInsight, risks: ["   "] })),
        ReportValidationError
    );
    assert.throws(
        () => parseAndValidateInsight(JSON.stringify({ ...validInsight, risks: ["x".repeat(401)] })),
        ReportValidationError
    );
    assert.throws(
        () => parseAndValidateInsight(JSON.stringify({ ...validInsight, risks: [42] })),
        ReportValidationError
    );
});
