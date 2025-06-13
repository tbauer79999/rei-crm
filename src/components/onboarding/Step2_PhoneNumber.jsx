// src/components/onboarding/Step2_PhoneNumber.jsx
import React, { useState, useEffect } from 'react';
import { Phone, Search, MapPin, Check, Loader, AlertCircle, Star } from 'lucide-react';
import supabase from '../../lib/supabaseClient';

const PhoneNumberSelector = ({ tenantId, formData, setFormData, onNext }) => {
  const [step, setStep] = useState('area-code'); // 'area-code', 'search', 'select', 'purchasing'
  const [selectedAreaCode, setSelectedAreaCode] = useState(formData.areaCode || '');
  const [customAreaCode, setCustomAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [popularAreaCodes, setPopularAreaCodes] = useState([]);
  const [purchasing, setPurchasing] = useState(false);
  const [userId, setUserId] = useState(null);

  // Helper function to make API calls with auth
  const callAPI = async (endpoint, options = {}) => {
    try {
      // Get the auth token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  // Get user ID on component mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUserId();
  }, []);

  // Pre-fill area code from Step 1 if available
  useEffect(() => {
    if (formData.areaCode && formData.areaCode.length === 3) {
      setSelectedAreaCode(formData.areaCode);
      // Don't auto-search, let user click to search
    }
  }, [formData.areaCode]);

  // Load popular area codes on component mount
  useEffect(() => {
    loadPopularAreaCodes();
  }, []);

  const loadPopularAreaCodes = async () => {
    try {
      setLoading(true);
      const data = await callAPI('/api/phone-numbers/popular-area-codes');
      setPopularAreaCodes(data.areaCodes);
    } catch (error) {
      console.error('Error loading area codes:', error);
      setError('Failed to load area codes');
    } finally {
      setLoading(false);
    }
  };

  const searchPhoneNumbers = async (areaCode) => {
    try {
      setLoading(true);
      setError('');
      
      const data = await callAPI(`/api/phone-numbers/search/${areaCode}`);
      
      if (data.availableNumbers.length === 0) {
        setError(`No phone numbers available in area code ${areaCode}. Try a different area code.`);
        return;
      }

      setAvailableNumbers(data.availableNumbers);
      setSelectedAreaCode(areaCode);
      setStep('select');
    } catch (error) {
      console.error('Error searching phone numbers:', error);
      setError('Failed to search phone numbers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const purchasePhoneNumber = async (phoneNumber) => {
    try {
      setPurchasing(true);
      setError('');

      // UPDATED: Include both userId and tenantId
      const data = await callAPI('/api/phone-numbers/purchase', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: phoneNumber.phoneNumber,
          userId: userId,
          tenantId: tenantId // ✅ ADDED: Include tenant ID
        }),
      });

      if (data.success) {
        setSelectedNumber(phoneNumber);
        
        // Update form data with the purchased number
        setFormData(prev => ({
          ...prev,
          phoneNumber: phoneNumber.phoneNumber,
          phoneConfigured: true
        }));
        
        setStep('purchased');
        
        // Continue to next step after short delay
        setTimeout(() => {
          onNext();
        }, 5000);
      }
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      setError('Failed to purchase phone number. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleAreaCodeSelect = (areaCode) => {
    searchPhoneNumbers(areaCode);
  };

  const handleCustomAreaCodeSubmit = (e) => {
    e.preventDefault();
    if (customAreaCode.length === 3 && /^\d{3}$/.test(customAreaCode)) {
      searchPhoneNumbers(customAreaCode);
    } else {
      setError('Please enter a valid 3-digit area code');
    }
  };

  const handleSkipForNow = () => {
    // Allow skipping phone number setup
    setFormData(prev => ({
      ...prev,
      phoneConfigured: false,
      phoneSkipped: true
    }));
    onNext();
  };

  const formatPhoneNumber = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const number = cleaned.substring(1);
      return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    }
    return phoneNumber;
  };

  // Validation: Check if tenantId is available
  if (!tenantId) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Required</h3>
        <p className="text-gray-600">Tenant information is required before configuring phone numbers.</p>
      </div>
    );
  }

  if (step === 'purchased') {
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Phone Number Configured! 📞
          </h2>
          <p className="text-gray-600 mt-2">Your business number is ready for AI outreach</p>
        </div>

        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {formatPhoneNumber(selectedNumber?.phoneNumber)} is ready!
          </h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-green-800">
              Your phone number has been provisioned and linked to your tenant account. Ready for AI campaigns!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone size={32} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Choose your business phone number
        </h2>
        <p className="text-gray-600 mt-2">Select a local number for your AI outreach campaigns</p>
      </div>

      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {step === 'area-code' && (
        <div className="space-y-6">
          {/* Pre-filled area code hint */}
          {formData.areaCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Suggested:</strong> Area code {formData.areaCode} (from your preferences)
              </p>
              <button
                onClick={() => handleAreaCodeSelect(formData.areaCode)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Search {formData.areaCode} Numbers
              </button>
            </div>
          )}

          {/* Popular Area Codes */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Popular Area Codes</h4>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {popularAreaCodes.map((areaCode) => (
                  <button
                    key={areaCode.code}
                    onClick={() => handleAreaCodeSelect(areaCode.code)}
                    disabled={!areaCode.available}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      areaCode.available
                        ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-900">({areaCode.code})</span>
                          {areaCode.available && <Star className="w-4 h-4 text-yellow-500 ml-2" />}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {areaCode.city}
                        </div>
                      </div>
                      <div className="text-right">
                        {areaCode.available ? (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            Available
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Limited
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Area Code Search */}
          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-900 mb-3">Or Enter a Specific Area Code</h4>
            <form onSubmit={handleCustomAreaCodeSubmit} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={customAreaCode}
                  onChange={(e) => setCustomAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="e.g., 555"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength="3"
                />
              </div>
              <button
                type="submit"
                disabled={customAreaCode.length !== 3 || loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </button>
            </form>
          </div>
        </div>
      )}

      {step === 'select' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Available Numbers in ({selectedAreaCode})
            </h4>
            <button
              onClick={() => {
                setStep('area-code');
                setAvailableNumbers([]);
                setError('');
              }}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              Change Area Code
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableNumbers.map((number, index) => (
                <div
                  key={number.phoneNumber}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900">
                      {formatPhoneNumber(number.phoneNumber)}
                    </div>
                    {number.locality && (
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {number.locality}, {number.region}
                      </div>
                    )}
                    <div className="flex items-center space-x-3 mt-2">
                      {number.capabilities.sms && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">SMS</span>
                      )}
                      {number.capabilities.voice && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Voice</span>
                      )}
                      {number.capabilities.mms && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">MMS</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-2">{number.cost}</div>
                    <button
                      onClick={() => purchasePhoneNumber(number)}
                      disabled={purchasing}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {purchasing ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        'Select'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skip option */}
      <div className="text-center border-t pt-6">
        <button
          onClick={handleSkipForNow}
          className="text-gray-500 hover:text-gray-700 text-sm underline"
        >
          Skip for now (configure later)
        </button>
      </div>
    </div>
  );
};

export default PhoneNumberSelector;