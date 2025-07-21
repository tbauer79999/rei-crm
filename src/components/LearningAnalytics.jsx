import React, { useState } from 'react';
import { Brain, TrendingUp, Users, MessageSquare, Lock, Zap, Target, Award, BarChart3, ArrowUp, ArrowDown, Info, Crown, Sparkles } from 'lucide-react';

const LearningTab = () => {
    const { currentPlan } = useAuth(); // growth, scale, enterprise
    const [learningData] = useState({
    conversationsAnalyzed: 847,
    planLimit: currentPlan === 'growth' ? 1000 : currentPlan === 'scale' ? 10000 : 'unlimited',
    improvementRate: 23,
    patternsDiscovered: 47,
    optimizedTone: 'Direct Closer',
    learningWeeks: 6
  });

  const PlanBadge = ({ plan }) => {
    const badges = {
      starter: { color: 'bg-gray-100 text-gray-700', label: 'Starter' },
      growth: { color: 'bg-blue-100 text-blue-700', label: 'Growth' },
      scale: { color: 'bg-purple-100 text-purple-700', label: 'Scale' },
      enterprise: { color: 'bg-gold-100 text-gold-700', label: 'Enterprise' }
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badges[plan].color}`}>
        {plan === 'enterprise' && <Crown className="w-4 h-4 mr-1" />}
        {badges[plan].label}
      </span>
    );
  };

  const LearningProgress = () => {
    const progress = currentPlan  === 'enterprise' ? 100 : 
                    currentPlan  === 'scale' ? 8.47 : 
                    (learningData.conversationsAnalyzed / learningData.planLimit) * 100;
    
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Brain className="w-6 h-6 mr-2 text-purple-600" />
            AI Learning Progress
          </h3>
          <PlanBadge plan={currentPlan} />
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Conversations Analyzed</span>
              <span className="font-medium">
                {learningData.conversationsAnalyzed.toLocaleString()} 
                {currentPlan !== 'enterprise' && ` / ${learningData.planLimit.toLocaleString()}`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  currentPlan === 'enterprise' ? 'bg-gradient-to-r from-gold-400 to-gold-600' :
                  progress > 80 ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                  'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            {currentPlan !== 'enterprise' && progress > 80 && (
              <p className="text-sm text-orange-600 mt-2 font-medium">
                ⚡ Approaching learning limit - upgrade for 10x more intelligence
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+{learningData.improvementRate}%</div>
              <div className="text-sm text-gray-600">Conversion Improvement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{learningData.patternsDiscovered}</div>
              <div className="text-sm text-gray-600">Patterns Discovered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{learningData.learningWeeks}</div>
              <div className="text-sm text-gray-600">Weeks Learning</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PersonalityInsights = () => {
    const personalityData = [
      { type: 'Decisive Leaders', percentage: 34, bestTone: 'Direct Closer', improvement: '+31%' },
      { type: 'Skeptical Buyers', percentage: 28, bestTone: 'Trust-Building', improvement: '+18%' },
      { type: 'Casual Browsers', percentage: 23, bestTone: 'Friendly & Casual', improvement: '+12%' },
      { type: 'Analytical Types', percentage: 15, bestTone: 'Detail-Oriented', improvement: '+25%' }
    ];

    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Users className="w-6 h-6 mr-2 text-blue-600" />
          Lead Personality Intelligence
        </h3>
        
        <div className="space-y-4">
          {personalityData.map((personality, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{personality.type}</span>
                <span className="text-sm font-semibold text-green-600">{personality.improvement}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{personality.percentage}% of your leads</span>
                <span className="text-sm text-purple-600 font-medium">Best: {personality.bestTone}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                  style={{ width: `${personality.percentage * 2.5}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-blue-900">AI Breakthrough</div>
              <div className="text-sm text-blue-700 mt-1">
                Your AI discovered that decisive leads respond 3x better to urgency language like "limited time" and "act now"
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MessageOptimization = () => {
    const optimizations = [
      {
        component: 'Opening Lines',
        before: 'Hey [name], hope you\'re doing well...',
        after: 'I noticed your company just expanded...',
        improvement: '+47%',
        icon: MessageSquare
      },
      {
        component: 'Question Style',
        before: 'Are you interested in learning more?',
        after: 'What\'s your biggest challenge with lead gen?',
        improvement: '+31%',
        icon: Target
      },
      {
        component: 'Call-to-Action',
        before: 'Let me know if you\'d like to chat',
        after: 'Worth a 15-min call this week?',
        improvement: '+22%',
        icon: Zap
      }
    ];

    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <MessageSquare className="w-6 h-6 mr-2 text-green-600" />
          Message Component Learning
        </h3>
        
        <div className="space-y-6">
          {optimizations.map((opt, index) => {
            const Icon = opt.icon;
            return (
              <div key={index} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{opt.component}</span>
                  </div>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {opt.improvement}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">BEFORE (AI Learning)</div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-gray-700">
                      "{opt.before}"
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">AFTER (AI Optimized)</div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700">
                      "{opt.after}"
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ConversationFlow = () => {
    const flowData = [
      { stage: 'Opening', successRate: 67, optimizedRate: 84, improvement: '+17%' },
      { stage: 'Engagement', successRate: 34, optimizedRate: 51, improvement: '+17%' },
      { stage: 'Objection Handling', successRate: 23, optimizedRate: 38, improvement: '+15%' },
      { stage: 'Closing', successRate: 12, optimizedRate: 18, improvement: '+6%' }
    ];

    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-purple-600" />
          Conversation Flow Optimization
        </h3>
        
        <div className="space-y-4">
          {flowData.map((flow, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900">{flow.stage}</span>
                <div className="flex items-center space-x-2">
                  <ArrowUp className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-600">{flow.improvement}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Before Learning</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-red-400 rounded-full"
                        style={{ width: `${flow.successRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{flow.successRate}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">After Learning</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${flow.optimizedRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{flow.optimizedRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-purple-50 rounded-xl">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-purple-900">Learning Insight</div>
              <div className="text-sm text-purple-700 mt-1">
                Your AI learned that leads who ask questions in their first response are 4x more likely to convert
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UpgradePrompt = () => {
    if (currentPlan === 'enterprise') return null;
    
    const nextPlan = currentPlan === 'starter' ? 'Growth' : currentPlan === 'growth' ? 'Scale' : 'Enterprise';
    const nextLimit = currentPlan === 'starter' ? '100' : currentPlan === 'growth' ? '1,000' : 'Unlimited';
    
    return (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-2">Unlock More AI Intelligence</h3>
            <p className="text-indigo-100 mb-4">
              Upgrade to {nextPlan} for {nextLimit} conversation learning and advanced psychology insights
            </p>
            <button className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              Upgrade to {nextPlan} Plan
            </button>
          </div>
          <div className="hidden md:block">
            <Crown className="w-16 h-16 text-indigo-200" />
          </div>
        </div>
      </div>
    );
  };

  if (currentPlan === 'starter') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Learning Requires Upgrade</h3>
          <p className="text-gray-600 mb-6">
            Unlock intelligent conversation analysis and psychological insights
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <Brain className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-blue-900">Personality Learning</div>
              <div className="text-xs text-blue-700">AI adapts to lead psychology</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-green-900">Message Optimization</div>
              <div className="text-xs text-green-700">Learn what language works</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-purple-900">Performance Growth</div>
              <div className="text-xs text-purple-700">Watch AI get smarter over time</div>
            </div>
          </div>
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
            Upgrade to Growth Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
        <div className="flex items-center space-x-3 mb-2">
          <Brain className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Learning Intelligence</h2>
            <p className="text-gray-600">Your AI is analyzing conversations and getting smarter every day</p>
          </div>
        </div>
      </div>
      
      <LearningProgress />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PersonalityInsights />
        <ConversationFlow />
      </div>
      
      <MessageOptimization />
      
      <UpgradePrompt />
    </div>
  );
};

export default LearningTab;