import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react';
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
  
  // Fetch industry field templates for the tenant
  useEffect(() => {
    const fetchIndustryFields = async () => {
      try {
        setLoading(true);
        
        // First get the tenant's industry_id
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('industry_id')
          .eq('id', tenantId)
          .single();
          
        if (tenantError || !tenant?.industry_id) {
          throw new Error('Industry not configured for your account. Please contact support.');
        }
        
        // Get field templates for this industry
        const { data: fields, error: fieldsError } = await supabase
          .from('industry_field_templates')
          .select('*')
          .eq('industry_id', tenant.industry_id)
          .order('display_order');
          
        if (fieldsError) throw fieldsError;
        
        setIndustryFields(fields || []);
      } catch (err) {
        console.error('Error fetching industry fields:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchIndustryFields();
    }
  }, [tenantId]);

  // Auto-suggest mappings based on field names/labels
  useEffect(() => {
    if (industryFields.length > 0 && csvHeaders.length > 0) {
      const autoMapping = {};
      
      csvHeaders.forEach(header => {
        const normalizedHeader = header.toLowerCase().trim();
        
        // Try to find exact matches first
        const exactMatch = industryFields.find(field => 
          field.field_name.toLowerCase() === normalizedHeader ||
          field.field_label.toLowerCase() === normalizedHeader
        );
        
        if (exactMatch) {
          autoMapping[header] = exactMatch.field_name;
          return;
        }
        
        // Try partial matches for common variations
        const partialMatch = industryFields.find(field => {
          const fieldName = field.field_name.toLowerCase();
          const fieldLabel = field.field_label.toLowerCase();
          
          return (
            normalizedHeader.includes(fieldName) ||
            fieldName.includes(normalizedHeader) ||
            normalizedHeader.includes(fieldLabel.split(' ')[0].toLowerCase()) ||
            // Common variations
            (normalizedHeader.includes('name') && fieldName === 'name') ||
            (normalizedHeader.includes('phone') && fieldName === 'phone') ||
            (normalizedHeader.includes('email') && fieldName === 'email') ||
            (normalizedHeader.includes('address') && fieldName.includes('address')) ||
            (normalizedHeader.includes('company') && fieldName === 'company') ||
            (normalizedHeader.includes('status') && fieldName === 'status')
          );
        });
        
        if (partialMatch) {
          autoMapping[header] = partialMatch.field_name;
        }
      });
      
      setFieldMapping(autoMapping);
    }
  }, [industryFields, csvHeaders]);

  const handleMappingChange = (csvHeader, targetField) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvHeader]: targetField
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
    const mappedFieldNames = Object.values(fieldMapping);
    return requiredFields.filter(field => mappedFieldNames.includes(field.field_name));
  };

  const getUnmappedRequiredFields = () => {
    const requiredFields = getRequiredFields();
    const mappedRequiredFields = getMappedRequiredFields();
    return requiredFields.filter(field => !mappedRequiredFields.includes(field));
  };

  const canProceed = () => {
    const unmappedRequired = getUnmappedRequiredFields();
    return unmappedRequired.length === 0 && Object.keys(fieldMapping).length > 0;
  };

  const handleContinue = () => {
    if (canProceed()) {
      onMappingComplete(fieldMapping);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading field configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
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
      </div>

      {/* Preview Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {csvHeaders.length} columns found • {Object.keys(fieldMapping).length} mapped
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
          <div className="text-xs">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${csvHeaders.length}, minmax(100px, 1fr))` }}>
              {/* Headers */}
              {csvHeaders.map(header => (
                <div key={header} className="font-medium text-gray-900 truncate">
                  {header}
                </div>
              ))}
              {/* Data rows */}
              {csvPreviewData.slice(0, 3).map((row, idx) => 
                csvHeaders.map(header => (
                  <div key={`${idx}-${header}`} className="text-gray-600 truncate">
                    {row[header] || '—'}
                  </div>
                ))
              )}
            </div>
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
                  {industryFields.map(field => (
                    <option key={field.field_name} value={field.field_name}>
                      {field.field_label} {field.is_required ? '*' : ''}
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
                  Please map these required fields: {getUnmappedRequiredFields().map(f => f.field_label).join(', ')}
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
                Ready to import! {Object.keys(fieldMapping).length} fields mapped.
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