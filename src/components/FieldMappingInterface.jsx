import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, X, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import supabase from '../lib/supabaseClient';

export default function FieldMappingInterface({ 
  csvHeaders, 
  csvPreviewData, 
  tenantId, 
  onMappingComplete, 
  onCancel 
}) {
  const [industryFields, setIndustryFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fieldMapping, setFieldMapping] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  
  // Fallback fields if database doesn't have proper templates
  const defaultFields = [
    { field_name: 'name', field_label: 'Full Name', field_type: 'text', is_required: true, display_order: 1 },
    { field_name: 'phone', field_label: 'Phone Number', field_type: 'phone', is_required: true, display_order: 2 },
    { field_name: 'email', field_label: 'Email Address', field_type: 'email', is_required: false, display_order: 3 },
    { field_name: 'property_address', field_label: 'Property Address', field_type: 'text', is_required: false, display_order: 4 },
    { field_name: 'status', field_label: 'Lead Status', field_type: 'select', is_required: false, display_order: 5 },
    { field_name: 'company_name', field_label: 'Company Name', field_type: 'text', is_required: false, display_order: 6 },
    { field_name: 'notes', field_label: 'Notes', field_type: 'textarea', is_required: false, display_order: 7 },
    { field_name: 'source', field_label: 'Lead Source', field_type: 'text', is_required: false, display_order: 8 },
    { field_name: 'budget', field_label: 'Budget', field_type: 'number', is_required: false, display_order: 9 },
    { field_name: 'timeline', field_label: 'Timeline', field_type: 'text', is_required: false, display_order: 10 }
  ];
  
  // Fetch industry field templates for the tenant
  useEffect(() => {
    const fetchIndustryFields = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Fetching fields for tenant:', tenantId);
        
        // First get the tenant's industry_id
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('industry_id')
          .eq('id', tenantId)
          .single();
          
        console.log('Tenant data:', tenant);
        
        if (tenantError) {
          console.error('Tenant error:', tenantError);
          console.log('Using default fields due to tenant error');
          setIndustryFields(defaultFields);
          generateAutoMapping(defaultFields);
          return;
        }
        
        if (!tenant?.industry_id) {
          console.log('No industry_id found, using default fields');
          setIndustryFields(defaultFields);
          generateAutoMapping(defaultFields);
          return;
        }
        
        // Get field templates for this industry
        const { data: fields, error: fieldsError } = await supabase
          .from('industry_field_templates')
          .select('*')
          .eq('industry_id', tenant.industry_id)
          .order('display_order');
          
        console.log('Industry fields raw:', fields);
        
        if (fieldsError) {
          console.error('Fields error:', fieldsError);
          console.log('Using default fields due to fetch error');
          setIndustryFields(defaultFields);
          generateAutoMapping(defaultFields);
          return;
        }
        
        // Check if we got valid field data
        if (!fields || fields.length === 0) {
          console.log('No fields found, using defaults');
          setIndustryFields(defaultFields);
          generateAutoMapping(defaultFields);
          return;
        }
        
        // Check for data quality issues
        const uniqueLabels = new Set(fields.map(f => f.field_label));
        const uniqueNames = new Set(fields.map(f => f.field_name));
        
        if (uniqueLabels.size === 1) {
          console.warn('Data quality issue: all fields have the same label');
          console.log('Field labels found:', Array.from(uniqueLabels));
          console.log('Using default fields due to data quality issue');
          setIndustryFields(defaultFields);
          generateAutoMapping(defaultFields);
          return;
        }
        
        if (uniqueNames.size === 1) {
          console.warn('Data quality issue: all fields have the same name');
          console.log('Field names found:', Array.from(uniqueNames));
          console.log('Using default fields due to data quality issue');
          setIndustryFields(defaultFields);
          generateAutoMapping(defaultFields);
          return;
        }
        
        // Data looks good, use it
        console.log('Using fetched industry fields:', fields.length);
        setIndustryFields(fields);
        generateAutoMapping(fields);
        
      } catch (err) {
        console.error('Error fetching industry fields:', err);
        console.log('Using default fields due to catch error');
        setIndustryFields(defaultFields);
        generateAutoMapping(defaultFields);
      } finally {
        setLoading(false);
      }
    };

    const generateAutoMapping = (fields) => {
      const autoMapping = {};
      csvHeaders.forEach(header => {
        const normalizedHeader = header.toLowerCase().trim();
        
        // Try exact matches first
        const exactMatch = fields.find(field => 
          field.field_name.toLowerCase() === normalizedHeader ||
          (field.field_label && field.field_label.toLowerCase()) === normalizedHeader
        );
        
        if (exactMatch) {
          autoMapping[header] = exactMatch.field_name;
          return;
        }
        
        // Try partial matches
        const partialMatch = fields.find(field => {
          const fieldName = field.field_name.toLowerCase();
          const fieldLabel = field.field_label ? field.field_label.toLowerCase() : '';
          
          return (
            normalizedHeader.includes(fieldName) ||
            fieldName.includes(normalizedHeader) ||
            (fieldLabel && normalizedHeader.includes(fieldLabel.split(' ')[0].toLowerCase())) ||
            // Common variations
            (normalizedHeader.includes('name') && fieldName.includes('name')) ||
            (normalizedHeader.includes('phone') && fieldName.includes('phone')) ||
            (normalizedHeader.includes('email') && fieldName.includes('email')) ||
            (normalizedHeader.includes('address') && fieldName.includes('address')) ||
            (normalizedHeader.includes('company') && fieldName.includes('company')) ||
            (normalizedHeader.includes('status') && fieldName.includes('status'))
          );
        });
        
        if (partialMatch) {
          autoMapping[header] = partialMatch.field_name;
        }
      });
      
      console.log('Generated auto-mapping:', autoMapping);
      setFieldMapping(autoMapping);
    };

    if (tenantId && csvHeaders.length > 0) {
      fetchIndustryFields();
    }
  }, [tenantId, csvHeaders]);

  const handleMappingChange = (csvHeader, targetField) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvHeader]: targetField === '' ? undefined : targetField
    }));
  };

  const handleRemoveMapping = (csvHeader) => {
    setFieldMapping(prev => {
      const newMapping = { ...prev };
      delete newMapping[csvHeader];
      return newMapping;
    });
  };

  const getRequiredFields = () => {
    return industryFields.filter(field => field.is_required);
  };

  const getMappedRequiredFields = () => {
    const requiredFields = getRequiredFields();
    const mappedFieldNames = Object.values(fieldMapping).filter(Boolean);
    return requiredFields.filter(field => mappedFieldNames.includes(field.field_name));
  };

  const getUnmappedRequiredFields = () => {
    const requiredFields = getRequiredFields();
    const mappedRequiredFields = getMappedRequiredFields();
    return requiredFields.filter(field => !mappedRequiredFields.some(mapped => mapped.field_name === field.field_name));
  };

  const canProceed = () => {
    const unmappedRequired = getUnmappedRequiredFields();
    const mappedFields = Object.values(fieldMapping).filter(Boolean);
    return unmappedRequired.length === 0 && mappedFields.length > 0;
  };

  const handleContinue = () => {
    if (canProceed()) {
      // Filter out empty mappings
      const cleanMapping = Object.fromEntries(
        Object.entries(fieldMapping).filter(([_, value]) => value)
      );
      onMappingComplete(cleanMapping);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading field configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Configuration Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={onCancel}
              className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
            >
              Go back and try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Your CSV Fields</h3>
        <p className="text-sm text-gray-600">
          Match your CSV columns to the appropriate fields. Required fields are marked with *.
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            Found {industryFields.length} available fields for mapping
          </p>
          {industryFields === defaultFields && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Using default fields
            </span>
          )}
        </div>
      </div>

      {/* Preview Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {csvHeaders.length} columns found • {Object.values(fieldMapping).filter(Boolean).length} mapped
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {showPreview ? 'Hide' : 'Show'} Data Preview
        </button>
      </div>

      {/* Data Preview */}
      {showPreview && csvPreviewData && csvPreviewData.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-2">First 3 rows:</h4>
          <div className="text-xs overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  {csvHeaders.map(header => (
                    <th key={header} className="text-left font-medium text-gray-900 px-2 py-1 border-b">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreviewData.slice(0, 3).map((row, idx) => (
                  <tr key={idx}>
                    {csvHeaders.map(header => (
                      <td key={header} className="text-gray-600 px-2 py-1 border-b">
                        {row[header] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mapping Interface */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {csvHeaders.map(header => {
          const mappedField = fieldMapping[header];
          const targetField = industryFields.find(f => f.field_name === mappedField);
          
          return (
            <div key={header} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              {/* CSV Column */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{header}</div>
                {csvPreviewData && csvPreviewData[0] && (
                  <div className="text-xs text-gray-500 truncate">
                    e.g., "{csvPreviewData[0][header] || 'empty'}"
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />

              {/* Target Field Selector */}
              <div className="flex-1">
                <select
                  value={mappedField || ''}
                  onChange={(e) => handleMappingChange(header, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Don't import this column</option>
                  {industryFields.map((field, index) => (
                    <option key={`${field.field_name}-${index}`} value={field.field_name}>
                      {field.field_label || field.field_name} {field.is_required ? '*' : ''}
                    </option>
                  ))}
                </select>
                
                {targetField && (
                  <div className="text-xs text-gray-500 mt-1">
                    {targetField.field_type} 
                    {targetField.is_required && <span className="text-red-600 ml-1">• Required</span>}
                  </div>
                )}
              </div>

              {/* Remove mapping */}
              {mappedField && (
                <button
                  onClick={() => handleRemoveMapping(header)}
                  className="p-1 text-gray-400 hover:text-red-600 flex-shrink-0"
                  title="Remove mapping"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation Messages */}
      <div className="space-y-2">
        {getUnmappedRequiredFields().length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Missing required fields</p>
                <p className="text-sm text-amber-700 mt-1">
                  Please map these required fields: {getUnmappedRequiredFields().map(f => f.field_label || f.field_name).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {canProceed() && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-600 mr-2" />
              <p className="text-sm text-green-800">
                Ready to import! {Object.values(fieldMapping).filter(Boolean).length} fields mapped.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          disabled={!canProceed()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <Check className="w-4 h-4 mr-2" />
          Continue with Mapping
        </button>
      </div>
    </div>
  );
}