import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
// Import due diligence checklist directly to avoid circular dependency
const DUE_DILIGENCE_CHECKLIST = {
  financialReview: 'Financial Review',
  legalReview: 'Legal Review',
  marketAnalysis: 'Market Analysis',
  teamAssessment: 'Team Assessment', 
  customerInterviews: 'Customer Interviews',
  competitorAnalysis: 'Competitor Analysis',
  technologyReview: 'Technology Review',
  businessModelValidation: 'Business Model Validation',
  regulatoryCompliance: 'Regulatory Compliance',
  esgAssessment: 'ESG Assessment'
};

// Takes a Mini Memo object and displays it in a nice format
export function MiniMemoDisplay({ memo }: { memo: any }) {
  // Extract assessment data if available
  const assessmentData = useMemo(() => {
    // Check if thesis has embedded assessment data
    if (memo.thesis && memo.thesis.includes('---ASSESSMENT_DATA---')) {
      try {
        const parts = memo.thesis.split('---ASSESSMENT_DATA---');
        const jsonStr = parts[1].trim();
        const data = JSON.parse(jsonStr);
        return {
          thesis: parts[0].trim(),
          ...data
        };
      } catch (e) {
        console.error('Failed to parse assessment data', e);
        return null;
      }
    }
    return null;
  }, [memo]);

  const hasAssessment = !!assessmentData;
  const thesis = hasAssessment ? assessmentData.thesis : memo.thesis;

  // Calculate assessment average excluding checklist
  const assessmentAverage = useMemo(() => {
    if (!hasAssessment) return null;
    
    const scores = [
      assessmentData.marketRiskScore,
      assessmentData.executionRiskScore,
      assessmentData.teamStrengthScore,
      assessmentData.productFitScore,
      assessmentData.valuationScore,
      assessmentData.competitiveAdvantageScore
    ].filter(Boolean);
    
    if (scores.length === 0) return null;
    
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return Math.round((sum / scores.length) * 10) / 10;
  }, [hasAssessment, assessmentData]);

  // Count completed due diligence items
  const dueDiligenceStats = useMemo(() => {
    if (!hasAssessment || !assessmentData.dueDiligenceChecklist) {
      return { completed: 0, total: Object.keys(DUE_DILIGENCE_CHECKLIST).length, percent: 0 };
    }
    
    const total = Object.keys(DUE_DILIGENCE_CHECKLIST).length;
    const completed = Object.values(assessmentData.dueDiligenceChecklist).filter(Boolean).length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100)
    };
  }, [hasAssessment, assessmentData]);

  return (
    <Card className="border rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
        <div className="flex items-center">
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 mr-2">
            <AvatarFallback 
              className="text-xs sm:text-sm bg-primary-100 text-primary-800"
            >
              {assessmentData?.userFullName 
                ? assessmentData.userFullName.substring(0, 2).toUpperCase() 
                : assessmentData?.username 
                  ? assessmentData.username.substring(0, 2).toUpperCase() 
                  : memo.user?.initials || "?"
              }
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              {assessmentData?.userFullName || assessmentData?.username || memo.user?.fullName || "Team Member"}
            </p>
            <p className="text-xs text-neutral-500">
              {assessmentData?.timestamp 
                ? new Date(assessmentData.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })
                : memo.createdAt 
                  ? new Date(memo.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })
                  : ""
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="mt-1 sm:mt-0 text-xs px-2 py-0.5">
            Score: {memo.score}
          </Badge>
          {hasAssessment && assessmentAverage && (
            <Badge variant="outline" className="mt-1 sm:mt-0 text-xs px-2 py-0.5 bg-blue-50">
              Assessment Avg: {assessmentAverage}
            </Badge>
          )}
        </div>
      </div>

      {hasAssessment ? (
        <Tabs defaultValue="thesis" className="w-full mt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="thesis">Thesis</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="diligence">Due Diligence</TabsTrigger>
          </TabsList>
          
          <TabsContent value="thesis" className="space-y-3 mt-3">
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-neutral-700">Investment Thesis</h4>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 whitespace-pre-line">{thesis}</p>
            </div>
            {memo.risksAndMitigations && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-neutral-700">Risks & Mitigations</h4>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1">{memo.risksAndMitigations}</p>
              </div>
            )}
            {memo.pricingConsideration && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-neutral-700">Pricing Considerations</h4>
                <p className="text-xs sm:text-sm text-neutral-600 mt-1">{memo.pricingConsideration}</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="assessment" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              {assessmentData.marketRiskScore && (
                <div className="p-2 border rounded-md bg-gray-50">
                  <p className="text-xs font-medium">Market Risk</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">High</span>
                    <span className="text-sm font-bold">{assessmentData.marketRiskScore}</span>
                    <span className="text-xs text-gray-500">Low</span>
                  </div>
                  <Progress value={assessmentData.marketRiskScore * 10} className="h-1 mt-1" />
                </div>
              )}
              
              {assessmentData.executionRiskScore && (
                <div className="p-2 border rounded-md bg-gray-50">
                  <p className="text-xs font-medium">Execution Risk</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">High</span>
                    <span className="text-sm font-bold">{assessmentData.executionRiskScore}</span>
                    <span className="text-xs text-gray-500">Low</span>
                  </div>
                  <Progress value={assessmentData.executionRiskScore * 10} className="h-1 mt-1" />
                </div>
              )}
              
              {assessmentData.teamStrengthScore && (
                <div className="p-2 border rounded-md bg-gray-50">
                  <p className="text-xs font-medium">Team Strength</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Weak</span>
                    <span className="text-sm font-bold">{assessmentData.teamStrengthScore}</span>
                    <span className="text-xs text-gray-500">Strong</span>
                  </div>
                  <Progress value={assessmentData.teamStrengthScore * 10} className="h-1 mt-1" />
                </div>
              )}
              
              {assessmentData.productFitScore && (
                <div className="p-2 border rounded-md bg-gray-50">
                  <p className="text-xs font-medium">Product Market Fit</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Poor</span>
                    <span className="text-sm font-bold">{assessmentData.productFitScore}</span>
                    <span className="text-xs text-gray-500">Excellent</span>
                  </div>
                  <Progress value={assessmentData.productFitScore * 10} className="h-1 mt-1" />
                </div>
              )}
              
              {assessmentData.valuationScore && (
                <div className="p-2 border rounded-md bg-gray-50">
                  <p className="text-xs font-medium">Valuation</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Expensive</span>
                    <span className="text-sm font-bold">{assessmentData.valuationScore}</span>
                    <span className="text-xs text-gray-500">Attractive</span>
                  </div>
                  <Progress value={assessmentData.valuationScore * 10} className="h-1 mt-1" />
                </div>
              )}
              
              {assessmentData.competitiveAdvantageScore && (
                <div className="p-2 border rounded-md bg-gray-50">
                  <p className="text-xs font-medium">Competitive Advantage</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Weak</span>
                    <span className="text-sm font-bold">{assessmentData.competitiveAdvantageScore}</span>
                    <span className="text-xs text-gray-500">Strong</span>
                  </div>
                  <Progress value={assessmentData.competitiveAdvantageScore * 10} className="h-1 mt-1" />
                </div>
              )}
            </div>
            
            <Separator className="my-2" />
            
            <div className="p-2 border rounded-md bg-blue-50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Overall Assessment</p>
                <span className="text-sm font-bold">{memo.score}/10</span>
              </div>
              <Progress value={memo.score * 10} className="h-2 mt-1" />
            </div>
          </TabsContent>
          
          <TabsContent value="diligence" className="space-y-3 mt-3">
            <div className="p-3 border rounded-md bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs sm:text-sm font-medium">Due Diligence Progress</h4>
                <Badge variant="secondary" className={`text-xs ${dueDiligenceStats.percent >= 70 ? "bg-green-100 text-green-800" : ""}`}>
                  {dueDiligenceStats.completed}/{dueDiligenceStats.total} ({dueDiligenceStats.percent}%)
                </Badge>
              </div>
              <Progress value={dueDiligenceStats.percent} className="h-2 mb-3" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {assessmentData.dueDiligenceChecklist && Object.entries(DUE_DILIGENCE_CHECKLIST).map(([key, label]) => {
                  const isChecked = assessmentData.dueDiligenceChecklist[key];
                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox id={`readonly-${key}`} checked={isChecked} disabled />
                      <Label 
                        htmlFor={`readonly-${key}`} 
                        className={`text-xs ${isChecked ? 'font-medium' : 'text-gray-500'}`}
                      >
                        {label as string}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-3">
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-neutral-700">Investment Thesis</h4>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1">{memo.thesis}</p>
          </div>
          {memo.risksAndMitigations && (
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-neutral-700">Risks & Mitigations</h4>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1">{memo.risksAndMitigations}</p>
            </div>
          )}
          {memo.pricingConsideration && (
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-neutral-700">Pricing Considerations</h4>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1">{memo.pricingConsideration}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
