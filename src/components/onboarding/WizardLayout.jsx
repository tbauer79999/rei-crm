// WizardLayout.jsx — Controls step navigation

import { useState } from 'react';
import Step1_CompanyInfo from './Step1_CompanyInfo';
import Step2_AIStyle from './Step2_AIStyle';
import Step3_OfficeHours from './Step3_OfficeHours';
import Step4_LeadFieldBuilder from './Step4_LeadFieldBuilder';
import Step5_AutomationPreferences from './Step5_AutomationPreferences';
import Step6_SuccessDemo from './Step6_SuccessDemo';

export default function WizardLayout() {
  const [step, setStep] = useState(1);
  const [tenantId, setTenantId] = useState(null);
console.log('Wizard loaded', { step, tenantId });
  const goToNext = (idFromStep) => {
    if (idFromStep) setTenantId(idFromStep);
    setStep((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white">
      {step === 1 && <Step1_CompanyInfo onNext={goToNext} />}
      {step === 2 && <Step2_AIStyle tenantId={tenantId} onNext={goToNext} />}
      {step === 3 && <Step3_OfficeHours tenantId={tenantId} onNext={goToNext} />}
      {step === 4 && <Step4_LeadFieldBuilder tenantId={tenantId} onNext={goToNext} />}
      {step === 5 && <Step5_AutomationPreferences tenantId={tenantId} onNext={goToNext} />}
      {step === 6 && <Step6_SuccessDemo tenantId={tenantId} />}
    </div>
  );
}
