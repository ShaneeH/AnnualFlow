// What the model would return for a CV if it followed the instructions.
export const cvLikeOutput = JSON.stringify({
    classification: {
        isFinancialReport: false,
        documentType: "CV / Resume",
        confidence: 0.98,
        reason: "A personal CV listing education and work experience."
    },
    company: "",
    reportName: "",
    reportType: "Other",
    reportDate: null,
    currency: null,
    source: null,
    periods: []
});

export const validInsightJson = JSON.stringify({
    performanceSummary: "Revenue reached 1.8bn with a 22.78% operating margin.",
    marketFactors: ["Demand for live events may have supported revenue."],
    economicPoliticalFactors: ["Consumer spending could be sensitive to interest rates."],
    socialFactors: ["Shifts to streaming may influence audience reach."],
    improvements: ["Converting more operating profit to cash would strengthen liquidity."],
    risks: ["Debt of 420m is worth watching relative to cash of 650m."]
});
