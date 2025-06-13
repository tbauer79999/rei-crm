// src/components/onboarding/Step1_CompanyInfo.jsx
import { useState, useEffect } from 'react';
import { Building2, Sparkles, CheckCircle, Search, Brain } from 'lucide-react';
import supabase from '../../lib/supabaseClient';


// Helper function to extract domain from email
const extractDomain = (email) => {
  if (!email) return null;
  const match = email.match(/@([^/]+)/);
  return match ? match[1].replace('/', '') : null;
};

// Helper function to get company logo with fallbacks
const getCompanyLogo = async (domain) => {
  const logoSources = [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://${domain}/favicon.ico`
  ];

  for (const logoUrl of logoSources) {
    try {
      const response = await fetch(logoUrl, { 
        method: 'HEAD',
        timeout: 3000 // 3 second timeout
      });
      if (response.ok) {
        return logoUrl;
      }
    } catch (error) {
      continue; // Try next source
    }
  }
  return null; // No logo found
};

// Helper function to research company
const researchCompany = async (domain) => {
  console.log('🔧 researchCompany called with domain:', domain);
  
  if (!domain || domain.includes('gmail.com') || domain.includes('yahoo.com') || 
      domain.includes('hotmail.com') || domain.includes('outlook.com')) {
    console.log('🚫 Skipping personal email domain:', domain);
    return null;
  }

  try {
    console.log('📤 Sending POST request to /api/research-company');
    
    const response = await fetch('/api/research-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain })
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);

    if (!response.ok) {
      console.log('❌ Response not ok');
      return null;
    }
    
    const data = await response.json();
    console.log('📋 Response data:', data);
    
    // Try to get company logo with client-side fallbacks
    const logoUrl = await getCompanyLogo(domain);
    if (logoUrl) {
      data.logoUrl = logoUrl;
      console.log('🖼️ Logo found:', logoUrl);
    }
    
    return data;
  } catch (error) {
    console.error('💥 Company research failed:', error);
    return null;
  }
};

// Smart industry detection from company description
const detectIndustry = (companyData) => {
  if (!companyData?.description) return '';
  
  const desc = companyData.description.toLowerCase();
  
  if (desc.includes('staffing') || desc.includes('recruiting') || desc.includes('recruitment')) {
    return 'Staffing/Recruiting';
  }
  if (desc.includes('real estate') || desc.includes('property') || desc.includes('homes')) {
    return 'Real Estate';
  }
  if (desc.includes('solar') || desc.includes('home improvement') || desc.includes('contractor')) {
    return 'Solar/Home Improvement';
  }
  if (desc.includes('automotive') || desc.includes('car') || desc.includes('vehicle')) {
    return 'Car Sales';
  }
  if (desc.includes('mortgage') || desc.includes('lending') || desc.includes('loan')) {
    return 'Mortgages/Lending';
  }
  if (desc.includes('b2b') || desc.includes('saas') || desc.includes('software') || desc.includes('services')) {
    return 'B2B Sales';
  }
  if (desc.includes('education') || desc.includes('training') || desc.includes('course')) {
    return 'For-Profit Education';
  }
  if (desc.includes('healthcare') || desc.includes('medical') || desc.includes('physician')) {
    return 'Healthcare';
  }
  if (desc.includes('insurance')) {
    return 'Insurance';
  }
  if (desc.includes('legal') || desc.includes('law')) {
    return 'Legal';
  }
  
  return '';
};

export default function Step1_CompanyInfo({ formData, setFormData, onNext }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companyResearch, setCompanyResearch] = useState(null);
  const [researchInsight, setResearchInsight] = useState('');

  const [industryOptions, setIndustryOptions] = useState([]);

useEffect(() => {
  const fetchIndustries = async () => {
    const { data, error } = await supabase.from('industries').select('*');
    if (!error) setIndustryOptions(data);
    else console.error('❌ Failed to load industries:', error);
  };

  fetchIndustries();
}, []);


  useEffect(() => {
    const initializeUser = async () => {
      console.log('=== Step1 Debug Start ===');
      
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Initial session:', session);
      
      if (!session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshData?.session) {
          session = refreshData.session;
        }
      }
      
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setUser({ ...session.user, tenant_id: profile.tenant_id });
          
          // ALWAYS auto-research company if email available (removed !formData.companyName condition)
          if (session.user.email) {
            console.log('Auto-researching company for:', session.user.email);
            await performCompanyResearch(session.user.email);
          } else {
            console.log('No email found for auto-research');
          }
        } else {
          setUser(session.user);
          
          // Still try research even without profile
          if (session.user.email) {
            console.log('Auto-researching company for user without profile:', session.user.email);
            await performCompanyResearch(session.user.email);
          }
        }
      } else {
        console.log('No user session found');
      }
      
      setLoading(false);
    };

    initializeUser();
  }, []); // Empty dependency array - only run once on mount

  const performCompanyResearch = async (email) => {
    console.log('🔍 Starting company research...');
    console.log('📧 Email:', email);
    
    const domain = extractDomain(email);
    console.log('🌐 Extracted domain:', domain);
    
    if (!domain) {
      console.log('❌ No domain extracted');
      return;
    }

    setResearchLoading(true);
    try {
      console.log('📡 Making API call to /api/research-company');
      
      const research = await researchCompany(domain);
      console.log('📊 Research result:', research);
      
      if (research) {
        console.log('✅ Research successful, updating form...');
        setCompanyResearch(research);
        
        // Auto-populate form data
        const detectedIndustry = detectIndustry(research);
        console.log('🏭 Detected industry:', detectedIndustry);
        
        setFormData(prev => ({
          ...prev,
          companyName: research.companyName || '',
          industry_id: '',
          description: research.description || '',
        }));

        // Create personalized insight message  
        if (research.insights?.length > 0) {
          // Use the first insight as the main message
          const insight = research.insights[0];
          setResearchInsight(insight);
          console.log('💡 Insight set:', insight);
        } else if (research.companyName) {
          const insight = `Great to meet you! We found ${research.companyName} and took the liberty of pre-filling some details to save you time.`;
          setResearchInsight(insight);
          console.log('💡 Default insight set:', insight);
        }
      } else {
        console.log('❌ No research data returned');
      }
    } catch (err) {
      console.error('💥 Research error:', err);
    } finally {
      setResearchLoading(false);
      console.log('🏁 Research process complete');
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setError(null);
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('Authentication required');
      }

      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', currentUser.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      console.log('Updating tenant with ID:', profile.tenant_id);
      
      const { error: tenantError } = await supabase
  .from('tenants')
  .update({
    name: formData.companyName,
    industry_id: formData.industry_id,
    description: formData.description,
    preferred_area_code: formData.areaCode
  })
  .eq('id', profile.tenant_id);


      if (tenantError) {
        console.error('Tenant update error:', tenantError);
        throw tenantError;
      }

      // Optional Twilio assignment
      try {
        await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: profile.tenant_id }),
        });
      } catch (apiError) {
        console.warn('API call failed but continuing:', apiError);
      }

      onNext(profile.tenant_id);
    } catch (err) {
      console.error('Step1 error:', err);
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Building2 size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Loading your account...
          </h2>
          <p className="text-gray-600 mt-2">Please wait while we set up your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-red-600">Authentication Error</h2>
          <p className="text-red-500 mt-2">Please try logging in again.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {companyResearch ? 'Hey there! 👋' : 'Tell us about your company'}
        </h2>
        <p className="text-gray-600 mt-2">
          {companyResearch ? 'We did a little research and found some info about your company' : 'This helps us personalize your CRM experience'}
        </p>
      </div>

      {/* Research Loading State */}
      {researchLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Looking up your company...</h3>
              <p className="text-sm text-blue-700">This will just take a moment...</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Research Results - Clean, Confident Design */}
      {researchInsight && !researchLoading && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex items-start space-x-4">
            {/* Company Logo */}
            <div className="flex-shrink-0">
              {companyResearch?.logoUrl ? (
                <img
                  src={companyResearch.logoUrl}
                  alt={`${formData.companyName} logo`}
                  className="w-12 h-12 rounded-lg object-contain bg-gray-50 border border-gray-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center" style={{display: companyResearch?.logoUrl ? 'none' : 'flex'}}>
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <p className="text-gray-800 leading-relaxed mb-4">{researchInsight}</p>
              
              {/* Additional insights if available */}
              {companyResearch?.insights && companyResearch.insights.length > 1 && (
                <div className="space-y-3">
                  {companyResearch.insights.slice(1).map((insight, index) => (
                    <p key={index} className="text-gray-700 leading-relaxed">{insight}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <span>Company Name *</span>
            {companyResearch && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Auto-filled</span>
              </div>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                companyResearch ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
              placeholder="Enter your company name"
            />
            {companyResearch?.logoUrl && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <img
                  src={companyResearch.logoUrl}
                  alt="Company logo"
                  className="w-6 h-6 rounded object-contain"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <span>Industry *</span>
            {companyResearch && formData.industry && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </label>
          <select
            value={formData.industry_id}
            onChange={(e) => setFormData({ ...formData, industry_id: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Select your industry</option>
            {industryOptions.map(ind => (
              <option key={ind.id} value={ind.id}>{ind.name}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <span>Company Description</span>
            {companyResearch && formData.description && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-24 resize-none"
            placeholder="Brief description of your business..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Preferred Area Code</label>
          <input
            type="text"
            value={formData.areaCode}
            onChange={(e) => setFormData({...formData, areaCode: e.target.value})}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., 602"
            maxLength={3}
          />
        </div>
      </div>

      {/* Manual Research Button - Only show if auto-research failed and fields are empty */}
      {!companyResearch && !researchLoading && user?.email && !formData.companyName && (
        <div className="text-center">
          <button
            onClick={() => performCompanyResearch(user.email)}
            className="flex items-center gap-2 mx-auto px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Search size={16} />
            Auto-fill from company research
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitLoading || !formData.companyName || !formData.industry_id}
          className={`
            px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2
            ${(formData.companyName && formData.industry_id) && !submitLoading
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg transform hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          {submitLoading ? 'Saving...' : 'Continue to Step 2'}
        </button>
      </div>
    </div>
  );
}