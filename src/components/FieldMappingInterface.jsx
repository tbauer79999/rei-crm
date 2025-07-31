import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, X, AlertCircle, Eye, EyeOff, Loader2, Zap, CheckCircle, Database, Building } from 'lucide-react';
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
  const [autoMappedFields, setAutoMappedFields] = useState(new Set());
  
  // Debug states
  const [debugInfo, setDebugInfo] = useState({
    tenantData: null,
    industryData: null,
    fieldsData: null,
    usingFallback: false
  });
  
  // Fallback fields - only used as absolute last resort
  const defaultFields = [
    { field_name: 'name', field_label: 'Full Name', field_type: 'text', is_required: true, display_order: 1 },
    { field_name: 'phone', field_label: 'Phone Number', field_type: 'phone', is_required: true, display_order: 2 },
    { field_name: 'email', field_label: 'Email Address', field_type: 'email', is_required: false, display_order: 3 },
    { field_name: 'property_address', field_label: 'Property Address', field_type: 'text', is_required: false, display_order: 4 },
    { field_name: 'status', field_label: 'Lead Status', field_type: 'select', is_required: false, display_order: 5 },
    { field_name: 'company_name', field_label: 'Company Name', field_type: 'text', is_required: false, display_order: 6 },
    { field_name: 'notes', field_label: 'Notes', field_type: 'textarea', is_required: false, display_order: 7 }
  ];
  
  // Enhanced industry field fetching with proper error handling
  useEffect(() => {
    const fetchIndustryFields = async () => {
      if (!tenantId || !csvHeaders.length) {
        console.log('Missing tenantId or csvHeaders');
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        console.log('🔍 Fetching fields for tenant:', tenantId);
        
        // Step 1: Get tenant with industry information
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select(`
            id,
            name,
            industry_id,
            industries (
              id,
              name,
              description
            )
          `)
          .eq('id', tenantId)
          .single();
          
        console.log('🏢 Tenant query result:', { tenant, error: tenantError });
        
        setDebugInfo(prev => ({ ...prev, tenantData: tenant }));
        
        if (tenantError) {
          console.error('❌ Tenant fetch error:', tenantError);
          throw new Error(`Failed to fetch tenant: ${tenantError.message}`);
        }
        
        if (!tenant) {
          throw new Error('Tenant not found');
        }
        
        if (!tenant.industry_id) {
          throw new Error(`No industry configured for tenant "${tenant.name}". Please set up your industry in account settings.`);
        }
        
        console.log('🏭 Tenant industry:', tenant.industries);
        
        // Step 2: Get field templates for this specific industry
        const { data: fields, error: fieldsError } = await supabase
          .from('industry_field_templates')
          .select(`
            id,
            industry_id,
            field_name,
            field_label,
            field_type,
            is_required,
            display_order,
            options
          `)
          .eq('industry_id', tenant.industry_id)
          .order('display_order', { ascending: true });
          
        console.log('📋 Fields query result:', { 
          industryId: tenant.industry_id,
          fields, 
          error: fieldsError,
          count: fields?.length 
        });
        
        setDebugInfo(prev => ({ 
          ...prev, 
          industryData: tenant.industries,
          fieldsData: fields 
        }));
        
        if (fieldsError) {
          console.error('❌ Fields fetch error:', fieldsError);
          throw new Error(`Failed to load field templates: ${fieldsError.message}`);
        }
        
        // Step 3: Validate field data quality
        if (!fields || fields.length === 0) {
          throw new Error(`No field templates found for industry "${tenant.industries?.name || tenant.industry_id}". Please contact support to set up field templates for your industry.`);
        }
        
        // Check for data quality issues
        const uniqueLabels = new Set(fields.map(f => f.field_label).filter(Boolean));
        const uniqueNames = new Set(fields.map(f => f.field_name).filter(Boolean));
        
        console.log('🔍 Data quality check:', {
          totalFields: fields.length,
          uniqueLabels: uniqueLabels.size,
          uniqueNames: uniqueNames.size,
          labels: Array.from(uniqueLabels),
          names: Array.from(uniqueNames)
        });
        
        if (uniqueLabels.size === 1 && uniqueLabels.has('lead status')) {
          console.warn('⚠️ Data quality issue: all fields have the same label "lead status"');
          throw new Error('Field template data quality issue detected. All fields have the same label. Please contact support to fix your industry field templates.');
        }
        
        if (uniqueNames.size === 1) {
          console.warn('⚠️ Data quality issue: all fields have the same name');
          throw new Error('Field template data quality issue detected. All fields have the same name. Please contact support to fix your industry field templates.');
        }
        
        // Step 4: Use the fetched fields
        console.log('✅ Using industry-specific fields:', fields.length, 'fields');
        setIndustryFields(fields);
        setDebugInfo(prev => ({ ...prev, usingFallback: false }));
        generateAutoMapping(fields);
        
      } catch (err) {
        console.error('💥 Error in fetchIndustryFields:', err);
        setError(err.message);
        
        // Only fall back to defaults if absolutely necessary
        console.warn('⚠️ Falling back to default fields due to error');
        setIndustryFields(defaultFields);
        setDebugInfo(prev => ({ ...prev, usingFallback: true }));
        generateAutoMapping(defaultFields);
      } finally {
        setLoading(false);
      }
    };

    const generateAutoMapping = (fields) => {
      const autoMapping = {};
      const autoMapped = new Set();
      
      console.log('🤖 Generating auto-mapping for', csvHeaders.length, 'CSV headers against', fields.length, 'field templates');
      
      csvHeaders.forEach(header => {
        const normalizedHeader = header.toLowerCase().trim();
        console.log(`🔍 Processing header: "${header}" (normalized: "${normalizedHeader}")`);
        
        // Try exact matches first (field_name or field_label)
        const exactMatch = fields.find(field => {
          const fieldName = field.field_name?.toLowerCase();
          const fieldLabel = field.field_label?.toLowerCase();
          
          return fieldName === normalizedHeader || fieldLabel === normalizedHeader;
        });
        
        if (exactMatch) {
          console.log(`✅ Exact match found: "${header}" → "${exactMatch.field_label}" (${exactMatch.field_name})`);
          autoMapping[header] = exactMatch.field_name;
          autoMapped.add(header);
          return;
        }
        
        // Try partial matches
        const partialMatch = fields.find(field => {
          const fieldName = field.field_name?.toLowerCase() || '';
          const fieldLabel = field.field_label?.toLowerCase() || '';
          
          // Check if header contains field name/label or vice versa
          const headerContainsField = normalizedHeader.includes(fieldName) || normalizedHeader.includes(fieldLabel.split(' ')[0]);
          const fieldContainsHeader = fieldName.includes(normalizedHeader) || fieldLabel.includes(normalizedHeader);
          
          // Common field mappings
          const commonMappings = [
            (normalizedHeader.includes('name') && (fieldName.includes('name') || fieldLabel.includes('name'))),
            (normalizedHeader.includes('phone') && (fieldName.includes('phone') || fieldLabel.includes('phone'))),
            (normalizedHeader.includes('email') && (fieldName.includes('email') || fieldLabel.includes('email'))),
            (normalizedHeader.includes('address') && (fieldName.includes('address') || fieldLabel.includes('address'))),
            (normalizedHeader.includes('company') && (fieldName.includes('company') || fieldLabel.includes('company'))),
            (normalizedHeader.includes('status') && (fieldName.includes('status') || fieldLabel.includes('status'))),
            (normalizedHeader.includes('property') && (fieldName.includes('property') || fieldLabel.includes('property')))
          ];
          
          return headerContainsField || fieldContainsHeader || commonMappings.some(Boolean);
        });
        
        if (partialMatch) {
          console.log(`🔶 Partial match found: "${header}" → "${partialMatch.field_label}" (${partialMatch.field_name})`);
          autoMapping[header] = partialMatch.field_name;
          autoMapped.add(header);
        } else {
          console.log(`❌ No match found for: "${header}"`);
        }
      });
      
      console.log('🎯 Auto-mapping complete:', {
        totalHeaders: csvHeaders.length,
        mappedHeaders: Object.keys(autoMapping).length,
        mapping: autoMapping
      });
      
      setFieldMapping(autoMapping);
      setAutoMappedFields(autoMapped);
    };

    fetchIndustryFields();
  }, [tenantId, csvHeaders]);

  const handleMappingChange = (csvHeader, targetField) => {
    console.log('🔄 Mapping change:', csvHeader, '→', targetField);
    setFieldMapping(prev => ({
      ...prev,
      [csvHeader]: targetField === '' ? undefined : targetField
    }));
    
    // Remove from auto-mapped set if user manually changes it
    if (autoMappedFields.has(csvHeader)) {
      setAutoMappedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(csvHeader);
        return newSet;
      });
    }
  };

  const handleRemoveMapping = (csvHeader) => {
    setFieldMapping(prev => {
      const newMapping = { ...prev };
      delete newMapping[csvHeader];
      return newMapping;
    });
    
    // Remove from auto-mapped set
    if (autoMappedFields.has(csvHeader)) {
      setAutoMappedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(csvHeader);
        return newSet;
      });
    }
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
      console.log('✅ Final mapping being sent:', cleanMapping);
      onMappingComplete(cleanMapping);
    }
  };

  // Calculate stats
  const autoMappedCount = Array.from(autoMappedFields).filter(header => fieldMapping[header]).length;
  const totalMappedCount = Object.values(fieldMapping).filter(Boolean).length;

  // Sort CSV headers: auto-mapped first, then unmapped
  const sortedHeaders = [...csvHeaders].sort((a, b) => {
    const aAutoMapped = autoMappedFields.has(a) && fieldMapping[a];
    const bAutoMapped = autoMappedFields.has(b) && fieldMapping[b];
    
    if (aAutoMapped && !bAutoMapped) return -1;
    if (!aAutoMapped && bAutoMapped) return 1;
    
    // Within each group, sort mapped vs unmapped
    const aMapped = Boolean(fieldMapping[a]);
    const bMapped = Boolean(fieldMapping[b]);
    
    if (aMapped && !bMapped) return -1;
    if (!aMapped && bMapped) return 1;
    
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading industry-specific field configuration...</p>
          <p className="text-xs text-gray-500 mt-2">Tenant ID: {tenantId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">Configuration Error</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            
            {/* Debug information */}
            <div className="mt-3 p-3 bg-red-100 rounded text-xs">
              <p className="font-medium text-red-900">Debug Information:</p>
              <ul className="mt-1 space-y-1 text-red-800">
                <li>• Tenant ID: {tenantId}</li>
                <li>• Tenant Data: {debugInfo.tenantData ? '✅ Found' : '❌ Not found'}</li>
                <li>• Industry: {debugInfo.industryData?.name || 'Not configured'}</li>
                <li>• Industry ID: {debugInfo.tenantData?.industry_id || 'None'}</li>
                <li>• Field Templates: {debugInfo.fieldsData?.length || 0} available</li>
                <li>• Using Fallback: {debugInfo.usingFallback ? 'Yes' : 'No'}</li>
              </ul>
            </div>
            
            <div className="mt-3 flex gap-2">
              <button
                onClick={onCancel}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Go back and try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Refresh page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Industry Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Your CSV Fields</h3>
        <p className="text-sm text-gray-600">
          Match your CSV columns to the appropriate fields. Required fields are marked with *.
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Found {industryFields.length} available fields</span>
            {debugInfo.industryData && (
              <div className="flex items-center gap-1">
                <Building className="w-3 h-3" />
                <span>Industry: {debugInfo.industryData.name}</span>
              </div>
            )}
            {debugInfo.usingFallback && (
              <span className="text-amber-600 font-medium">⚠️ Using fallback fields</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!debugInfo.usingFallback && debugInfo.industryData && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                <Database className="w-3 h-3 inline mr-1" />
                Industry-specific
              </span>
            )}
            {debugInfo.usingFallback && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Using defaults
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mapping Stats & Preview Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            {csvHeaders.length} columns found • {totalMappedCount} mapped
          </span>
          {autoMappedCount > 0 && (
            <div className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full">
              <Zap className="w-3 h-3" />
              <span className="text-xs font-medium">{autoMappedCount} auto-mapped</span>
            </div>
          )}
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

      {/* Enhanced Mapping Interface */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedHeaders.map((header, index) => {
          const mappedField = fieldMapping[header];
          const targetField = industryFields.find(f => f.field_name === mappedField);
          const isAutoMapped = autoMappedFields.has(header) && mappedField;
          const isMapped = Boolean(mappedField);
          
          return (
            <div key={header} className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
              isAutoMapped 
                ? 'bg-green-50 border-2 border-green-200' 
                : isMapped 
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50 border border-gray-200'
            }`}>
              {/* Status Indicator */}
              <div className="flex-shrink-0">
                {isAutoMapped ? (
                  <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                    <Zap className="w-3 h-3 text-green-600" />
                  </div>
                ) : isMapped ? (
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
                    <CheckCircle className="w-3 h-3 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-gray-200 rounded-full" />
                )}
              </div>

              {/* CSV Column */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-900 truncate">{header}</div>
                  {isAutoMapped && (
                    <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                      Auto
                    </span>
                  )}
                </div>
                {csvPreviewData && csvPreviewData[0] && (
                  <div className="text-xs text-gray-500 truncate">
                    e.g., "{csvPreviewData[0][header] || 'empty'}"
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className={`w-4 h-4 flex-shrink-0 ${
                isAutoMapped ? 'text-green-400' : isMapped ? 'text-blue-400' : 'text-gray-400'
              }`} />

              {/* Target Field Selector */}
              <div className="flex-1">
                <select
                  value={mappedField || ''}
                  onChange={(e) => handleMappingChange(header, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isAutoMapped 
                      ? 'border-green-300 bg-green-50' 
                      : isMapped 
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Don't import this column</option>
                  {industryFields.map((field, fieldIndex) => (
                    <option key={`${field.field_name}-${fieldIndex}`} value={field.field_name}>
                      {field.field_label || field.field_name} {field.is_required ? '*' : ''}
                    </option>
                  ))}
                </select>
                
                {targetField && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span>{targetField.field_type}</span>
                    {targetField.is_required && <span className="text-red-600">• Required</span>}
                    {isAutoMapped && <span className="text-green-600">• Auto-detected</span>}
                  </div>
                )}
              </div>

              {/* Remove mapping */}
              {mappedField && (
                <button
                  onClick={() => handleRemoveMapping(header)}
                  className={`p-1 flex-shrink-0 transition-colors ${
                    isAutoMapped 
                      ? 'text-green-400 hover:text-red-600' 
                      : 'text-gray-400 hover:text-red-600'
                  }`}
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
                Ready to import! {totalMappedCount} fields mapped
                {autoMappedCount > 0 && ` (${autoMappedCount} auto-detected)`}.
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