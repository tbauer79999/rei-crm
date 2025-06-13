// src/components/onboarding/WizardLayout.jsx
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Building2, MessageCircle, Clock, Settings, Zap, CheckCircle, Phone } from 'lucide-react';
import supabase from '../../lib/supabaseClient';
import Step1_CompanyInfo from './Step1_CompanyInfo';
import Step2_PhoneNumber from './Step2_PhoneNumber'; // New import
import Step3_AIStyle from './Step3_AIStyle'; // Renamed from Step2
import Step4_OfficeHours from './Step4_OfficeHours'; // Renamed from Step3
import Step5_LeadFieldBuilder from './Step5_LeadFieldBuilder'; // Renamed from Step4
import Step6_AutomationPreferences from './Step6_AutomationPreferences'; // Renamed from Step5
import Step7_SuccessDemo from './Step7_SuccessDemo'; // Renamed from Step6

export default function WizardLayout() {
  const [step, setStep] = useState(1); // Always start at step 1
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Centralized form data state
  const [formData, setFormData] = useState({
    companyName: '',
    industry_id: '',
    description: '',
    areaCode: '',
    phoneNumber: '', // New field
    phoneConfigured: false, // New field
    phoneSkipped: false, // New field
    tone: '',
    persona: '',
    openHour: '9',
    closeHour: '17',
    days: 'M–F',
    selectedFields: ['name', 'phone', 'email', 'status'], // Default selected fields
    aiEnabled: true,
    reengagement: true,
    loadDemo: true
  });

  const totalSteps = 7; // Updated from 6 to 7

  const steps = [
    { 
      id: 1, 
      title: "Company Info", 
      icon: Building2, 
      description: "Tell us about your business",
      color: "from-blue-500 to-purple-600"
    },
    { 
      id: 2, 
      title: "Phone Number", 
      icon: Phone, 
      description: "Choose your business number",
      color: "from-purple-500 to-pink-600"
    },
    { 
      id: 3, 
      title: "AI Style", 
      icon: MessageCircle, 
      description: "Configure your AI assistant",
      color: "from-pink-500 to-red-600"
    },
    { 
      id: 4, 
      title: "Office Hours", 
      icon: Clock, 
      description: "Set your availability",
      color: "from-red-500 to-orange-600"
    },
    { 
      id: 5, 
      title: "Lead Fields", 
      icon: Settings, 
      description: "Customize lead tracking",
      color: "from-orange-500 to-yellow-600"
    },
    { 
      id: 6, 
      title: "Automation", 
      icon: Zap, 
      description: "Enable smart features",
      color: "from-yellow-500 to-green-600"
    },
    { 
      id: 7, 
      title: "Complete", 
      icon: CheckCircle, 
      description: "You're all set!",
      color: "from-green-500 to-emerald-600"
    }
  ];

  // Check user's onboarding status and initialize properly
  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        console.log('=== Onboarding Initialization ===');
        
        // Clear any existing localStorage data to start fresh
        localStorage.removeItem('onboarding_step');
        localStorage.removeItem('onboarding_tenant_id');
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError('Authentication required. Please log in.');
          setLoading(false);
          return;
        }

        console.log('User found:', user.id);

        // Get user profile and tenant info
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id, role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          console.error('Profile error:', profileError);
          setError('User profile not found. Please contact support.');
          setLoading(false);
          return;
        }

        console.log('Profile found:', profile);
        setTenantId(profile.tenant_id);

        // Check tenant's onboarding status
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('onboarding_complete, name, industry, preferred_area_code')
          .eq('id', profile.tenant_id)
          .single();

        if (tenantError) {
          console.error('Tenant error:', tenantError);
          setError('Tenant information not found.');
          setLoading(false);
          return;
        }

        console.log('Tenant data:', tenant);

        // If onboarding is already complete, redirect to dashboard
        if (tenant.onboarding_complete) {
          console.log('Onboarding already complete, redirecting...');
          window.location.href = '/dashboard';
          return;
        }

        // Pre-fill form data if tenant has existing info
        if (tenant.name || tenant.industry || tenant.preferred_area_code) {
          setFormData(prev => ({
            ...prev,
            companyName: tenant.name || '',
            industry: tenant.industry || '',
            areaCode: tenant.preferred_area_code || ''
          }));
        }

        // Start at step 1 (fresh onboarding)
        setStep(1);
        console.log('Starting fresh onboarding at step 1');
        
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize onboarding. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    initializeOnboarding();
  }, []);

  const goToNext = (idFromStep) => {
    if (idFromStep) {
      setTenantId(idFromStep);
      localStorage.setItem('onboarding_tenant_id', idFromStep);
    }
    
    const nextStep = step + 1;
    setStep(nextStep);
    localStorage.setItem('onboarding_step', nextStep.toString());
  };

  const goToPrevious = () => {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      localStorage.setItem('onboarding_step', prevStep.toString());
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-12">
      {steps.map((stepItem, index) => {
        const Icon = stepItem.icon;
        const isActive = step === stepItem.id;
        const isCompleted = step > stepItem.id;
        
        return (
          <div key={stepItem.id} className="flex items-center">
            <div className={`
              relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300
              ${isActive ? `bg-gradient-to-r ${stepItem.color} text-white shadow-lg scale-110` : 
                isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}
            `}>
              <Icon size={20} />
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
              )}
            </div>
            
            {index < steps.length - 1 && (
              <div className={`
                w-16 h-1 mx-2 transition-all duration-300
                ${step > stepItem.id ? 'bg-green-500' : 'bg-gray-200'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep = () => {
    const commonProps = {
      tenantId,
      formData,
      setFormData,
      onNext: goToNext
    };

    switch(step) {
      case 1:
        return <Step1_CompanyInfo {...commonProps} />;
      case 2:
        return <Step2_PhoneNumber {...commonProps} />;
      case 3:
        return <Step3_AIStyle {...commonProps} />;
      case 4:
        return <Step4_OfficeHours {...commonProps} />;
      case 5:
        return <Step5_LeadFieldBuilder {...commonProps} />;
      case 6:
        return <Step6_AutomationPreferences {...commonProps} />;
      case 7:
        return <Step7_SuccessDemo tenantId={tenantId} formData={formData} setFormData={setFormData} />;
      default:
        return <Step1_CompanyInfo {...commonProps} />;
    }
  };

  const canProceed = () => {
    switch(step) {
      case 1: return formData.companyName && formData.industry;
      case 2: return formData.phoneConfigured || formData.phoneSkipped; // Can proceed if phone configured OR skipped
      case 3: return formData.tone && formData.persona;
      case 4: return true;
      case 5: return formData.selectedFields.length > 0;
      case 6: return true;
      case 7: return true;
      default: return false;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Building2 size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Preparing your onboarding...</h2>
          <p className="text-gray-600">This will just take a moment</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Onboarding Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const currentStepData = steps.find(stepItem => stepItem.id === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-gray-800">REI-CRM Setup</span>
          </div>
          <div className="text-sm text-gray-500">
            Step {step} of {totalSteps}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <StepIndicator />
        
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 md:p-12">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={goToPrevious}
            disabled={step === 1}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
              ${step === 1 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}
            `}
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          {/* Only show Next button for steps 1-6, step 7 has its own finish button */}
          {step < 7 && (
            <button
              onClick={goToNext}
              disabled={!canProceed()}
              className={`
                flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all
                ${canProceed()
                  ? `bg-gradient-to-r ${currentStepData?.color} text-white hover:shadow-lg transform hover:scale-105`
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
              `}
            >
              Continue
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}