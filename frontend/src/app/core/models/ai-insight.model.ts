export interface AiInsightContent {
  performanceSummary: string;
  marketFactors: string[];
  economicPoliticalFactors: string[];
  socialFactors: string[];
  improvements: string[];
  risks: string[];
}

export interface AiInsight {
  companyId: number;
  period: string;
  content: AiInsightContent;
  model: string;
  generatedAt: string;
}
