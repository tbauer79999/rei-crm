import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectItem } from "../ui/select";
import supabase from "../../lib/supabaseClient";
import Button from '../ui/button';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  Calendar,
  MapPin,
  Globe,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function CompanySettings() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [dayPreset, setDayPreset] = useState("");

  // Get the correct API base URL
  const getApiBaseUrl = () => {
    // Use the environment variable you already have set
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // For development
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3001'; // or whatever your local API port is
    }
    
    // Fallback - but you shouldn't need this since you have the env var
    return 'https://api.getsurfox.com/api';
  };

  // Enhanced API call helper with better error handling
  const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!session?.access_token) {
        throw new Error('No valid session found. Please log in again.');
      }

      const apiBaseUrl = getApiBaseUrl();
      const fullUrl = `${apiBaseUrl}${endpoint}`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        ...options.headers
      };

      console.log('Making API request to:', fullUrl);

      const response = await fetch(fullUrl, {
        ...options,
        headers
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        // Check if response is HTML (common when API endpoint doesn't exist)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(`API endpoint not found. Expected JSON but received HTML. Check your API URL: ${fullUrl}`);
        }

        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, include more details
          const responseText = await response.text();
          errorMessage = `${errorMessage}. Response: ${responseText.substring(0, 200)}...`;
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      
      // Check if response is actually JSON
      if (!responseText) {
        return {};
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', responseText);
        throw new Error(`Invalid JSON response from API: ${responseText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (authLoading) return;

      if (!user || !user.tenant_id) {
        console.warn("User or tenant_id not available. Skipping settings load.");
        setData({});
        setStartHour("");
        setEndHour("");
        setDayPreset("");
        setSettingsLoading(false);
        return;
      }

      setSettingsLoading(true);
      setError('');
      try {
        console.log("Loading settings for tenant_id:", user.tenant_id);
        
        // Use API endpoint - note: don't add /api since it's already in REACT_APP_API_URL
        const settings = await makeAuthenticatedRequest(`/settings?tenant_id=${user.tenant_id}`);

        setData(settings);

        const open = settings.officeOpenHour?.value || "";
        const close = settings.officeCloseHour?.value || "";
        const daysRaw = settings.officeDays?.value || "";
        const days = daysRaw ? daysRaw.split(",") : [];

        setStartHour(open);
        setEndHour(close);

        if (Array.isArray(days) && days.length > 0) {
          if (days.length === 7) setDayPreset("Everyday");
          else if (days.length === 6 && !days.includes("Sunday"))
            setDayPreset("M–Sat");
          else if (
            days.length === 5 &&
            days.includes("Monday") &&
            days.includes("Friday")
          )
            setDayPreset("M–F");
          else setDayPreset("");
        } else {
          setDayPreset("");
        }
      } catch (err) {
        console.error("Failed to load settings", err);
        setError(`Failed to load settings: ${err.message}`);
        setData({});
        setStartHour("");
        setEndHour("");
        setDayPreset("");
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, [user?.tenant_id, user?.role, authLoading]);

  const handleChange = (key, value) => {
    setData((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { id: key }),
        value,
      },
    }));
  };

  const handleSave = async () => {
    if (!user || !user.tenant_id) {
      setError("Cannot save settings: User or tenant_id not available.");
      return;
    }
    
    if (!['global_admin', 'business_admin'].includes(user.role)) {
      setError("Admin role required to save settings.");
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const dayMap = {
        "M–F": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "M–Sat": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        Everyday: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      };

      const translatedDays = dayPreset ? dayMap[dayPreset] || [] : [];

      const settingsPayload = {
        ...data,
        officeOpenHour: { value: startHour },
        officeCloseHour: { value: endHour },
        officeDays: { value: translatedDays.join(",") },
      };

      // Filter out undefined values and prepare for API
      const cleanedSettings = {};
      Object.entries(settingsPayload).forEach(([key, entry]) => {
        if (entry && typeof entry.value !== 'undefined') {
          cleanedSettings[key] = entry;
        }
      });

      if (Object.keys(cleanedSettings).length === 0) {
        console.log("No data to save.");
        setSaving(false);
        return;
      }

      console.log("Saving company settings:", cleanedSettings);
      
      await makeAuthenticatedRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify({ 
          settings: cleanedSettings, 
          tenant_id: user.tenant_id 
        })
      });

      // Update local state
      const newData = { ...settingsPayload };
      if (newData.officeDays) {
        newData.officeDays = { ...newData.officeDays, value: translatedDays.join(",") };
      }
      setData(newData);

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("Save failed", err);
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const hourOptions = [
    { label: "8:00 AM", value: "8" },
    { label: "9:00 AM", value: "9" },
    { label: "10:00 AM", value: "10" },
    { label: "11:00 AM", value: "11" },
  ];

  const closingHourOptions = [
    { label: "4:00 PM", value: "16" },
    { label: "5:00 PM", value: "17" },
    { label: "6:00 PM", value: "18" },
    { label: "7:00 PM", value: "19" },
    { label: "8:00 PM", value: "20" },
  ];

  const dayOptions = ["M–F", "M–Sat", "Everyday"];

  const timezoneOptions = [
    { label: "Eastern Standard Time (EST)", value: "EST" },
    { label: "Central Standard Time (CST)", value: "CST" },
    { label: "Mountain Standard Time (MST)", value: "MST" },
    { label: "Pacific Standard Time (PST)", value: "PST" },
  ];

  if (authLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!user) return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p className="text-gray-600">User not found. Please log in to manage company settings.</p>
    </div>
  );

  if (settingsLoading && user.tenant_id) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!user.tenant_id && !settingsLoading) return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
      <p className="text-gray-600">Tenant information is missing. Cannot load or save settings.</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-green-800 font-medium">{success}</span>
        </div>
      )}

      {/* Basic Company Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Basic Company Information</h3>
            <p className="text-gray-600 text-sm">Core business details and contact information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="company_name" className="flex items-center space-x-2 mb-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span>Company Name</span>
            </Label>
            <Input
              id="company_name"
              value={data.company_name?.value || ""}
              onChange={(e) => handleChange("company_name", e.target.value)}
              placeholder="Your Company Name"
            />
          </div>

          <div>
            <Label htmlFor="business_type" className="flex items-center space-x-2 mb-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span>Business Type</span>
            </Label>
            <Select
              value={data.business_type?.value || ""}
              onValueChange={(val) => handleChange("business_type", val)}
            >
              <SelectItem value="llc">LLC</SelectItem>
              <SelectItem value="corp">Corporation</SelectItem>
              <SelectItem value="sole">Sole Proprietor</SelectItem>
              <SelectItem value="nonprofit">Nonprofit</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </Select>
          </div>

          <div>
            <Label htmlFor="primary_contact" className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>Primary Contact Name</span>
            </Label>
            <Input
              id="primary_contact"
              value={data.primary_contact?.value || ""}
              onChange={(e) => handleChange("primary_contact", e.target.value)}
              placeholder="Contact Person"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="flex items-center space-x-2 mb-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span>Phone Number</span>
            </Label>
            <Input
              id="phone"
              value={data.phone?.value || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="email" className="flex items-center space-x-2 mb-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>Support Email Address</span>
            </Label>
            <Input
              id="email"
              value={data.email?.value || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="support@yourcompany.com"
            />
          </div>

          <div>
            <Label htmlFor="timezone" className="flex items-center space-x-2 mb-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <span>Time Zone</span>
            </Label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={data.timezone?.value || ""}
              onChange={(e) => handleChange("timezone", e.target.value)}
            >
              <option value="">Select timezone</option>
              {timezoneOptions.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Operating Hours</h3>
            <p className="text-gray-600 text-sm">Business hours and active days for customer contact</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Opening Time</span>
            </Label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
            >
              <option value="">Select opening time</option>
              {hourOptions.map((hr) => (
                <option key={hr.value} value={hr.value}>
                  {hr.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Closing Time</span>
            </Label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
            >
              <option value="">Select closing time</option>
              {closingHourOptions.map((hr) => (
                <option key={hr.value} value={hr.value}>
                  {hr.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="flex items-center space-x-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Active Days</span>
            </Label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={dayPreset}
              onChange={(e) => setDayPreset(e.target.value)}
            >
              <option value="">Select days</option>
              {dayOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Location & Service Areas */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Location & Service Areas</h3>
            <p className="text-gray-600 text-sm">Business address and operational regions</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="address" className="flex items-center space-x-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>Business Address</span>
            </Label>
            <Textarea
              id="address"
              value={data.address?.value || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main Street, City, State, ZIP"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="regions" className="flex items-center space-x-2 mb-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <span>Service Areas / Regions</span>
            </Label>
            <Textarea
              id="regions"
              value={data.regions?.value || ""}
              onChange={(e) => handleChange("regions", e.target.value)}
              placeholder="List the cities, counties, or regions you serve"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Current Configuration Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Configuration</h3>
            <p className="text-gray-600 text-sm">Summary of your company settings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Company</div>
            <div className="font-medium text-gray-900">
              {data.company_name?.value || 'Not set'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Operating Hours</div>
            <div className="font-medium text-gray-900">
              {startHour && endHour ? `${startHour}:00 - ${endHour}:00` : 'Not set'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Active Days</div>
            <div className="font-medium text-gray-900">
              {dayPreset || 'Not set'}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <div className="flex items-center space-x-4">
          {!['global_admin', 'business_admin'].includes(user?.role) && !authLoading && !settingsLoading && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Admin role required to save changes</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !['global_admin', 'business_admin'].includes(user?.role) || settingsLoading || authLoading}
            className="px-6 py-2"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : success ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Saved</span>
              </div>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}