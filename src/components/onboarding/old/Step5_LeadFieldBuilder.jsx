// src/components/onboarding/Step4_LeadFieldBuilder.jsx
import { useState, useEffect } from 'react';
import { Settings, Users, Phone, Mail, BarChart3, Rocket, CheckCircle, Info } from 'lucide-react';
import supabase from '../../lib/supabaseClient';

// Universal fields that EVERY industry gets
const universalFields = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, icon: Users },
  { name: 'phone', label: 'Phone Number', type: 'text', required: true, icon: Phone },
  { name: 'email', label: 'Email Address', type: 'text', required: false, icon: Mail },
  { name: 'status', label: 'Lead Status', type: 'dropdown', required: true, icon: BarChart3, 
    options: ['Cold', 'Warm', 'Hot', 'Escalated'] },
  { name: 'campaign', label: 'Campaign Source', type: 'text', required: false, icon: Rocket }
];

// Industry-specific conversion fields (3-5 per industry)
const industrySpecificFields = {
  'Real Estate': [
    { name: 'property_address', label: 'Property Address', type: 'text', required: true, icon: 'MapPin' },
    { name: 'motivation_to_sell', label: 'Motivation to Sell', type: 'dropdown', required: false, icon: 'TrendingUp',
      options: ['1-Low', '2', '3', '4', '5-Medium', '6', '7', '8', '9', '10-High'] },
    { name: 'repairs_needed', label: 'Repairs Needed', type: 'dropdown', required: false, icon: 'Wrench',
      options: ['None', 'Minor', 'Major', 'Unknown'] },
    { name: 'timeline', label: 'Selling Timeline', type: 'dropdown', required: false, icon: 'Clock',
      options: ['ASAP', '1-3 months', '3-6 months', '6+ months', 'Just exploring'] }
  ],

  'Car Sales': [
    { name: 'current_vehicle', label: 'Current Vehicle', type: 'text', required: false, icon: 'Car' },
    { name: 'lease_end_date', label: 'Lease End Date', type: 'date', required: false, icon: 'Calendar' },
    { name: 'trade_in_interest', label: 'Trade-in Interest', type: 'dropdown', required: false, icon: 'ArrowLeftRight',
      options: ['Yes', 'No', 'Maybe', 'Need appraisal'] },
    { name: 'budget_range', label: 'Budget Range', type: 'dropdown', required: false, icon: 'DollarSign',
      options: ['Under $20k', '$20k-$35k', '$35k-$50k', '$50k-$75k', '$75k+'] },
    { name: 'financing_need', label: 'Financing Needed', type: 'dropdown', required: false, icon: 'CreditCard',
      options: ['Cash', 'Finance', 'Lease', 'Unsure'] }
  ],

  'Solar/Home Improvement': [
    { name: 'property_address', label: 'Property Address', type: 'text', required: true, icon: 'MapPin' },
    { name: 'monthly_electric_bill', label: 'Monthly Electric Bill', type: 'dropdown', required: false, icon: 'Zap',
      options: ['Under $100', '$100-$200', '$200-$300', '$300-$500', '$500+'] },
    { name: 'roof_condition', label: 'Roof Condition', type: 'dropdown', required: false, icon: 'Home',
      options: ['Good', 'Needs minor work', 'Needs major work', 'Unknown'] },
    { name: 'homeowner_status', label: 'Homeowner Status', type: 'dropdown', required: false, icon: 'Key',
      options: ['Own', 'Rent', 'Other'] },
    { name: 'project_timeline', label: 'Project Timeline', type: 'dropdown', required: false, icon: 'Clock',
      options: ['ASAP', '1-3 months', '3-6 months', '6+ months', 'Just researching'] }
  ],

  'Mortgages/Lending': [
    { name: 'property_value', label: 'Property Value', type: 'dropdown', required: false, icon: 'DollarSign',
      options: ['Under $200k', '$200k-$400k', '$400k-$600k', '$600k-$800k', '$800k+'] },
    { name: 'loan_type_interest', label: 'Loan Type Interest', type: 'dropdown', required: false, icon: 'CreditCard',
      options: ['Purchase', 'Refinance', 'Cash-out refi', 'HELOC', 'Unsure'] },
    { name: 'credit_score_range', label: 'Credit Score Range', type: 'dropdown', required: false, icon: 'BarChart3',
      options: ['750+', '700-749', '650-699', '600-649', 'Under 600', 'Unknown'] },
    { name: 'down_payment', label: 'Down Payment Available', type: 'dropdown', required: false, icon: 'Wallet',
      options: ['20%+', '10-20%', '5-10%', '3-5%', 'Less than 3%', 'Unsure'] },
    { name: 'urgency', label: 'Urgency Level', type: 'dropdown', required: false, icon: 'Clock',
      options: ['ASAP', '30 days', '60 days', '90+ days', 'Just shopping rates'] }
  ],

  'B2B Sales': [
    { name: 'company_name', label: 'Company Name', type: 'text', required: false, icon: 'Building2' },
    { name: 'company_size', label: 'Company Size', type: 'dropdown', required: false, icon: 'Users',
      options: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
    { name: 'job_title', label: 'Job Title', type: 'text', required: false, icon: 'Briefcase' },
    { name: 'decision_maker', label: 'Decision Making Role', type: 'dropdown', required: false, icon: 'Crown',
      options: ['Decision maker', 'Influencer', 'End user', 'Gatekeeper', 'Unknown'] },
    { name: 'budget_authority', label: 'Budget Authority', type: 'dropdown', required: false, icon: 'DollarSign',
      options: ['Yes', 'Partial', 'No', 'Unknown'] }
  ],

  'Staffing': [
    { name: 'current_role', label: 'Current Role', type: 'text', required: false, icon: 'Briefcase' },
    { name: 'years_experience', label: 'Years Experience', type: 'dropdown', required: false, icon: 'Calendar',
      options: ['0-2', '3-5', '6-10', '11-15', '15+'] },
    { name: 'salary_expectations', label: 'Salary Expectations', type: 'dropdown', required: false, icon: 'DollarSign',
      options: ['Under $50k', '$50k-$75k', '$75k-$100k', '$100k-$150k', '$150k+', 'Negotiable'] },
    { name: 'availability', label: 'Job Search Status', type: 'dropdown', required: false, icon: 'Search',
      options: ['Actively looking', 'Open to opportunities', 'Passive', 'Not looking', 'Unsure'] },
    { name: 'location_preference', label: 'Location Preference', type: 'dropdown', required: false, icon: 'MapPin',
      options: ['Remote only', 'Hybrid', 'On-site only', 'Flexible', 'Willing to relocate'] }
  ],

  'For-Profit Education': [
    { name: 'education_level', label: 'Current Education Level', type: 'dropdown', required: false, icon: 'GraduationCap',
      options: ['High school', 'Some college', 'Associates', 'Bachelors', 'Masters+'] },
    { name: 'career_interest', label: 'Career Interest', type: 'text', required: false, icon: 'Target' },
    { name: 'timeline_to_start', label: 'Timeline to Start', type: 'dropdown', required: false, icon: 'Clock',
      options: ['ASAP', '1-3 months', '3-6 months', '6+ months', 'Just exploring'] },
    { name: 'funding_method', label: 'Funding Method', type: 'dropdown', required: false, icon: 'CreditCard',
      options: ['Financial aid', 'Out of pocket', 'Employer sponsored', 'Payment plan', 'Unsure'] },
    { name: 'availability', label: 'Schedule Availability', type: 'dropdown', required: false, icon: 'Calendar',
      options: ['Full-time', 'Part-time evenings', 'Weekends', 'Online only', 'Flexible'] }
  ]
};

export default function Step4_LeadFieldBuilder({ tenantId, formData, setFormData, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [industry, setIndustry] = useState('');

  // Get industry from tenant (set in Step 1)
  useEffect(() => {
    const fetchIndustry = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) return;

        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('industry')
          .eq('id', profile.tenant_id)
          .single();

        if (tenant?.industry) {
          setIndustry(tenant.industry);
          
          // Auto-select all fields for this industry if not already set
          if (!formData.selectedFields || formData.selectedFields.length === 0) {
            const allFields = [...universalFields, ...(industrySpecificFields[tenant.industry] || [])];
            const allFieldNames = allFields.map(f => f.name);
            setFormData({...formData, selectedFields: allFieldNames});
          }
        }
      } catch (err) {
        console.error('Error fetching industry:', err);
      }
    };

    fetchIndustry();
  }, [tenantId]);

  const toggleField = (fieldName) => {
    const currentFields = formData.selectedFields || [];
    const updatedFields = currentFields.includes(fieldName)
      ? currentFields.filter(f => f !== fieldName)
      : [...currentFields, fieldName];
    
    setFormData({...formData, selectedFields: updatedFields});
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      const selectedFields = formData.selectedFields || [];
      const allFields = [...universalFields, ...(industrySpecificFields[industry] || [])];
      
      const fieldsToInsert = allFields
        .filter(f => selectedFields.includes(f.name))
        .map(f => ({
          tenant_id: profile.tenant_id,
          field_name: f.name,
          field_label: f.label,
          field_type: f.type,
          is_required: f.required,
          options: f.options || null,
        }));

      console.log('Inserting lead field config for tenant:', profile.tenant_id);
      const { error } = await supabase.from('lead_field_config').insert(fieldsToInsert);
      
      if (error) {
        console.error('Lead field config error:', error);
        throw error;
      }

      console.log('Lead field config saved successfully');
      onNext();
    } catch (err) {
      console.error('Step4 error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedFields = formData.selectedFields || [];
  const industryFields = industrySpecificFields[industry] || [];
  const allFields = [...universalFields, ...industryFields];

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
          Customize lead tracking
        </h2>
        <p className="text-gray-600 mt-2">Choose fields for converting {industry.toLowerCase()} leads</p>
      </div>

      {industry && (
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Your industry:</strong> {industry}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                We've pre-selected the essential fields for converting {industry.toLowerCase()} leads. 
                You can add or remove fields as needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Universal Fields Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-600" />
          <span>Essential Fields (All Industries)</span>
        </h3>
        <div className="space-y-3">
          {universalFields.map(field => {
            const Icon = field.icon;
            const isSelected = selectedFields.includes(field.name);
            
            return (
              <div
                key={field.name}
                onClick={() => toggleField(field.name)}
                className={`
                  p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={isSelected ? 'text-blue-500' : 'text-gray-400'} />
                    <div>
                      <div className="font-medium">{field.label}</div>
                      <div className="text-sm text-gray-500">
                        Type: {field.type} {field.required ? '(Required)' : '(Optional)'}
                      </div>
                    </div>
                  </div>
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                  `}>
                    {isSelected && <CheckCircle size={16} className="text-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Industry-Specific Fields Section */}
      {industryFields.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-orange-600" />
            <span>{industry} Conversion Fields</span>
          </h3>
          <div className="space-y-3">
            {industryFields.map(field => {
              const Icon = field.icon === 'string' ? Settings : field.icon; // Fallback for string icons
              const isSelected = selectedFields.includes(field.name);
              
              return (
                <div
                  key={field.name}
                  onClick={() => toggleField(field.name)}
                  className={`
                    p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={isSelected ? 'text-orange-500' : 'text-gray-400'} />
                      <div>
                        <div className="font-medium">{field.label}</div>
                        <div className="text-sm text-gray-500">
                          Type: {field.type} {field.required ? '(Required)' : '(Optional)'}
                        </div>
                      </div>
                    </div>
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                      ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}
                    `}>
                      {isSelected && <CheckCircle size={16} className="text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-2">Selected Fields Summary</h4>
        <p className="text-sm text-gray-600">
          {selectedFields.length} fields selected • {universalFields.filter(f => selectedFields.includes(f.name)).length} essential + {industryFields.filter(f => selectedFields.includes(f.name)).length} industry-specific
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading || selectedFields.length === 0}
          className={`
            px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2
            ${selectedFields.length > 0 && !loading
              ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white hover:shadow-lg transform hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          {loading ? 'Saving...' : 'Continue to Step 5'}
        </button>
      </div>
    </div>
  );
}