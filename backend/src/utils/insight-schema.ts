import { ReportValidationError } from "./errors";

/** Section keys, in display order. */
export const INSIGHT_LIST_SECTIONS = [
    "marketFactors",
    "economicPoliticalFactors",
    "socialFactors",
    "improvements",
    "risks"
] as const;

export type InsightListSection = typeof INSIGHT_LIST_SECTIONS[number];

export interface AiInsightContent {
    performanceSummary: string;
    marketFactors: string[];
    economicPoliticalFactors: string[];
    socialFactors: string[];
    improvements: string[];
    risks: string[];
}

export const MAX_SUMMARY_LENGTH = 1_200;
export const MAX_POINT_LENGTH = 400;
export const MIN_POINTS = 1;
export const MAX_POINTS = 5;

const pointList = {
    type: "array",
    minItems: MIN_POINTS,
    maxItems: MAX_POINTS,
    items: { type: "string" }
};

/** Strict JSON schema for the Responses API structured output. */
export const aiInsightSchema = {
    type: "object",
    additionalProperties: false,
    required: ["performanceSummary", ...INSIGHT_LIST_SECTIONS],
    properties: {
        performanceSummary: { type: "string" },
        marketFactors: pointList,
        economicPoliticalFactors: pointList,
        socialFactors: pointList,
        improvements: pointList,
        risks: pointList
    }
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, field: string, maxLength: number): string {
    if (typeof value !== "string") {
        throw new ReportValidationError(`The AI insight ${field} is invalid.`);
    }

    // Collapse whitespace and strip control characters.
    const text = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

    if (!text) {
        throw new ReportValidationError(`The AI insight ${field} is empty.`);
    }
    if (text.length > maxLength) {
        throw new ReportValidationError(`The AI insight ${field} is too long.`);
    }

    return text;
}

/**
 * Parses and strictly validates model output before it is stored or shown.
 * Rejects unknown keys, wrong types, empty or oversized text and bad list sizes.
 */
export function parseAndValidateInsight(raw: string): AiInsightContent {
    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new ReportValidationError("The insight service returned invalid JSON.");
    }

    if (!isRecord(parsed)) {
        throw new ReportValidationError("The insight service returned an invalid insight.");
    }

    const allowed = new Set<string>(["performanceSummary", ...INSIGHT_LIST_SECTIONS]);
    const unknownKey = Object.keys(parsed).find(key => !allowed.has(key));
    if (unknownKey) {
        throw new ReportValidationError(`The AI insight contains an unexpected field '${unknownKey}'.`);
    }

    const content: AiInsightContent = {
        performanceSummary: cleanText(
            parsed.performanceSummary,
            "performance summary",
            MAX_SUMMARY_LENGTH
        ),
        marketFactors: [],
        economicPoliticalFactors: [],
        socialFactors: [],
        improvements: [],
        risks: []
    };

    for (const section of INSIGHT_LIST_SECTIONS) {
        const list = parsed[section];

        if (!Array.isArray(list) || list.length < MIN_POINTS || list.length > MAX_POINTS) {
            throw new ReportValidationError(
                `The AI insight section '${section}' must have ${MIN_POINTS}-${MAX_POINTS} points.`
            );
        }

        content[section] = list.map(point => cleanText(point, section, MAX_POINT_LENGTH));
    }

    return content;
}
