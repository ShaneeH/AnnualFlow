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
