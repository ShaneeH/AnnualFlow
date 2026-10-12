import { db } from "../database/db";
import { NotFoundError } from "../utils/errors";
import {
    AiInsightContent,
    aiInsightSchema,
    parseAndValidateInsight
} from "../utils/insight-schema";
import { insightInstructions } from "../utils/insight-prompt";
import { getCompanyPeriods, getFinancialPeriod } from "./companies.service";
import { generateStructuredJson } from "./openai.service";

export interface AiInsight {
    companyId: number;
    period: string;
    content: AiInsightContent;
    model: string;
    generatedAt: string;
}

/** Deterministic figures sent to the model. */
export interface InsightContext {
    companyName: string;
    currency: string | null;
    period: string;
    periodLabel: string | null;
    periodEnd: string | null;
    financials: Record<string, unknown>;
    metrics: Record<string, unknown>;
    comparison: {
        period: string;
        growthPercent: Record<string, unknown>;
    } | null;
}

export interface InsightDeps {
    findInsight(companyId: number, period: string): Promise<AiInsight | null>;
    loadContext(companyId: number, period: string): Promise<InsightContext | null>;
    generate(context: InsightContext): Promise<{ text: string; model: string }>;
    saveInsight(
        companyId: number,
        period: string,
        content: AiInsightContent,
        model: string
    ): Promise<AiInsight>;
}

interface PeriodRef {
    period: string;
    periodEnd: string | null;
}

/**
 * Picks the period to compare against: the same kind of period one year
 * earlier (FY2025 -> FY2024, Q2_2025 -> Q2_2024) when it exists, otherwise
 * the closest earlier period by end date. Returns null if there is none.
 */
export function findPreviousPeriod(
    periods: PeriodRef[],
    target: string
): string | null {
    const match = /^(.*?)(\d{4})$/.exec(target);

    if (match) {
        const likeForLike = `${match[1]}${Number(match[2]) - 1}`;
        if (periods.some(p => p.period === likeForLike)) return likeForLike;
    }

    const current = periods.find(p => p.period === target);
    if (!current?.periodEnd) return null;

    const earlier = periods
        .filter(p => p.period !== target && p.periodEnd && p.periodEnd < current.periodEnd!)
        .sort((a, b) => (a.periodEnd! < b.periodEnd! ? 1 : -1));

    return earlier[0]?.period ?? null;
}

export function buildInsightInput(context: InsightContext): string {
    return [
        "Write the insight for this reporting period.",
        "Data (JSON, values computed by the application; null = not reported):",
        JSON.stringify(context, null, 2)
    ].join("\n");
}

async function findInsightInDb(companyId: number, period: string): Promise<AiInsight | null> {
    const result = await db.query<AiInsight>(
        `
        SELECT
            company_id AS "companyId",
            period,
            content,
            model,
            generated_at AS "generatedAt"
        FROM ai_insights
        WHERE company_id = $1
          AND period = $2
        LIMIT 1;
        `,
        [companyId, period]
    );

    return result.rows[0] ?? null;
}

async function saveInsightToDb(
    companyId: number,
    period: string,
    content: AiInsightContent,
    model: string
): Promise<AiInsight> {
    const result = await db.query<AiInsight>(
        `
        INSERT INTO ai_insights (company_id, period, content, model, generated_at)
        VALUES ($1, $2, $3::jsonb, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (company_id, period) DO UPDATE
        SET content = EXCLUDED.content,
            model = EXCLUDED.model,
            generated_at = EXCLUDED.generated_at
        RETURNING
            company_id AS "companyId",
            period,
            content,
            model,
            generated_at AS "generatedAt";
        `,
        [companyId, period, JSON.stringify(content), model]
    );

    return result.rows[0];
}

async function loadContextFromDb(
    companyId: number,
    period: string
): Promise<InsightContext | null> {
    const periods = await getCompanyPeriods(companyId);
    if (!periods.some((p: PeriodRef) => p.period === period)) return null;

    const previous = findPreviousPeriod(periods, period);
    const data = await getFinancialPeriod(companyId, period, previous ?? undefined);
    if (!data) return null;

    const currencyResult = await db.query<{ currency: string | null }>(
        `
        SELECT d.currency
        FROM financial_periods fp
        JOIN document_periods dp ON dp.period_id = fp.period_id
        JOIN documents d ON d.document_id = dp.document_id
        WHERE fp.company_id = $1
          AND fp.period = $2
          AND d.currency IS NOT NULL
        ORDER BY d.uploaded_at DESC
        LIMIT 1;
        `,
        [companyId, period]
    );

    const { companyName, periodLabel, periodEnd, companyId: _id, period: _p, ...financials } =
        data.financials as Record<string, unknown>;

    return {
        companyName: String(companyName),
        currency: currencyResult.rows[0]?.currency ?? null,
        period,
        periodLabel: (periodLabel as string | null) ?? null,
        periodEnd: (periodEnd as string | null) ?? null,
        financials,
        metrics: data.metrics as unknown as Record<string, unknown>,
        comparison: previous && "comparison" in data && data.comparison
            ? {
                period: previous,
                growthPercent: data.comparison as unknown as Record<string, unknown>
            }
            : null
    };
}

export const defaultInsightDeps: InsightDeps = {
    findInsight: findInsightInDb,
    loadContext: loadContextFromDb,
    generate: context =>
        generateStructuredJson({
            instructions: insightInstructions,
            input: buildInsightInput(context),
            schemaName: "ai_insight",
            schema: aiInsightSchema
        }),
    saveInsight: saveInsightToDb
};

export async function getInsight(
    companyId: number,
    period: string,
    deps: InsightDeps = defaultInsightDeps
): Promise<AiInsight | null> {
    return deps.findInsight(companyId, period);
}

/**
 * Returns the cached insight, or generates, validates and stores a new one.
 * `regenerate` forces a fresh generation. Nothing is saved unless the model
 * output passes strict validation.
 */
export async function generateInsight(
    companyId: number,
    period: string,
    options: { regenerate?: boolean } = {},
    deps: InsightDeps = defaultInsightDeps
): Promise<{ insight: AiInsight; cached: boolean }> {
    if (!options.regenerate) {
        const cached = await deps.findInsight(companyId, period);
        if (cached) return { insight: cached, cached: true };
    }

    const context = await deps.loadContext(companyId, period);
    if (!context) {
        throw new NotFoundError("Financial period not found.");
    }

    const { text, model } = await deps.generate(context);
    const content = parseAndValidateInsight(text);
    const insight = await deps.saveInsight(companyId, period, content, model);

    return { insight, cached: false };
}
