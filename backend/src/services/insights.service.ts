import { db } from "../database/db";
import { AppError, NotFoundError } from "../utils/errors";
import {
    AiInsightContent,
    aiInsightSchema,
    parseAndValidateInsight
} from "../utils/insight-schema";
import { insightInstructions } from "../utils/insight-prompt";
import { CompanyAccess, getCompanyAccess, getCompanyPeriods, getFinancialPeriod } from "./companies.service";
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
    /** Ownership check: "owner", "public" (readable, not writable) or null (hidden/missing). */
    companyAccess(companyId: number, viewerId: number | null): Promise<CompanyAccess>;
    findInsight(companyId: number, period: string, viewerId: number | null): Promise<AiInsight | null>;
    loadContext(companyId: number, period: string, ownerId: number): Promise<InsightContext | null>;
    generate(context: InsightContext): Promise<{ text: string; model: string }>;
    saveInsight(
        companyId: number,
        period: string,
        content: AiInsightContent,
        model: string,
        ownerId: number
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

async function findInsightInDb(
    companyId: number,
    period: string,
    viewerId: number | null
): Promise<AiInsight | null> {
    const result = await db.query<AiInsight>(
        `
        SELECT
            ai.company_id AS "companyId",
            ai.period,
            ai.content,
            ai.model,
            ai.generated_at AS "generatedAt"
        FROM ai_insights ai
        JOIN companies c ON c.company_id = ai.company_id
        WHERE ai.company_id = $1
          AND ai.period = $2
          AND (c.user_id IS NULL OR c.user_id = $3)
        LIMIT 1;
        `,
        [companyId, period, viewerId]
    );

    return result.rows[0] ?? null;
}

async function saveInsightToDb(
    companyId: number,
    period: string,
    content: AiInsightContent,
    model: string,
    ownerId: number
): Promise<AiInsight> {
    // Only writes for a company the user owns; public (example) insights are never overwritten.
    const result = await db.query<AiInsight>(
        `
        INSERT INTO ai_insights (company_id, period, content, model, generated_at)
        SELECT $1, $2, $3::jsonb, $4, CURRENT_TIMESTAMP
        WHERE EXISTS (SELECT 1 FROM companies WHERE company_id = $1 AND user_id = $5)
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
        [companyId, period, JSON.stringify(content), model, ownerId]
    );

    if (!result.rows[0]) throw new NotFoundError("Financial period not found.");
    return result.rows[0];
}

async function loadContextFromDb(
    companyId: number,
    period: string,
    ownerId: number
): Promise<InsightContext | null> {
    const periods = await getCompanyPeriods(companyId, ownerId);
    if (!periods.some((p: PeriodRef) => p.period === period)) return null;

    const previous = findPreviousPeriod(periods, period);
    const data = await getFinancialPeriod(companyId, period, ownerId, previous ?? undefined);
    if (!data) return null;

    const currencyResult = await db.query<{ currency: string | null }>(
        `
        SELECT d.currency
        FROM financial_periods fp
        JOIN document_periods dp ON dp.period_id = fp.period_id
        JOIN documents d ON d.document_id = dp.document_id
        WHERE fp.company_id = $1
          AND fp.period = $2
          AND (d.user_id IS NULL OR d.user_id = $3)
          AND d.currency IS NOT NULL
        ORDER BY d.uploaded_at DESC
        LIMIT 1;
        `,
        [companyId, period, ownerId]
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
    companyAccess: getCompanyAccess,
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
    viewerId: number | null,
    deps: InsightDeps = defaultInsightDeps
): Promise<AiInsight | null> {
    if (!(await deps.companyAccess(companyId, viewerId))) return null;
    return deps.findInsight(companyId, period, viewerId);
}

/**
 * Returns the cached insight, or generates, validates and stores a new one.
 * `regenerate` forces a fresh generation. Nothing is saved unless the model
 * output passes strict validation.
 */
export async function generateInsight(
    companyId: number,
    period: string,
    options: { regenerate?: boolean; userId?: number | null } = {},
    deps: InsightDeps = defaultInsightDeps
): Promise<{ insight: AiInsight; cached: boolean }> {
    const userId = options.userId ?? null;
    const access = await deps.companyAccess(companyId, userId);
    if (!access) throw new NotFoundError("Financial period not found.");

    if (!options.regenerate) {
        const cached = await deps.findInsight(companyId, period, userId);
        if (cached) return { insight: cached, cached: true };
    }

    // Generating writes data, so it is only allowed on the user's own companies.
    if (access !== "owner" || userId === null) {
        throw new AppError("The example dataset is read-only. Upload your own report to generate AI insights.", 403);
    }

    const context = await deps.loadContext(companyId, period, userId);
    if (!context) {
        throw new NotFoundError("Financial period not found.");
    }

    const { text, model } = await deps.generate(context);
    const content = parseAndValidateInsight(text);
    const insight = await deps.saveInsight(companyId, period, content, model, userId);

    return { insight, cached: false };
}
