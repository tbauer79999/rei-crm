import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext"; // Import useAuth
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectItem } from "../ui/select";
import { Card, CardContent } from "../ui/card";
import supabase from "../../lib/supabaseClient";
import Button from '../ui/button'; // Import the custom Button component

export default function CompanySettings() {
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
  const [data, setData] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(true); // Renamed to avoid conflict
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [dayPreset, setDayPreset] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      if (authLoading) {
        // Don't run if auth is still loading, wait for user object to be available
        return;
      }

      if (!user || !user.tenant_id) {
        console.warn(
          "User or tenant_id not available. Skipping settings load."
        );
        setData({}); // Reset data or handle as appropriate
        setStartHour("");
        setEndHour("");
        setDayPreset("");
        setSettingsLoading(false);
        return;
      }

      setSettingsLoading(true);
      try {
        console.log("Loading settings for tenant_id:", user.tenant_id);
        const { data: settingsData, error } = await supabase
          .from("platform_settings")
          .select("key, value")
          .eq("tenant_id", user.tenant_id); // Filter by tenant_id

        if (error) throw error;

        const json = settingsData.reduce((acc, row) => {
          acc[row.key] = {
            id: row.key, // Assuming 'key' from DB is the ID for the setting entry
            value: row.value,
          };
          return acc;
        }, {});

        setData(json);

        // Update local state for hour/day presets based on loaded data
        const open = json.officeOpenHour?.value || "";
        const close = json.officeCloseHour?.value || "";
        const daysRaw = json.officeDays?.value || "";
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
          else setDayPreset(""); // Reset if no match
        } else {
          setDayPreset(""); // Reset if not an array or empty
        }
      } catch (err) {
        console.error("Failed to load settings", err);
        setData({}); // Reset data on error
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
      console.error("Cannot save settings: User or tenant_id not available.");
      return;
    }
    if (user.role !== "admin") {
      console.warn("Save operation denied: User is not an admin.");
      return;
    }

    try {
      setSaving(true);

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

      const updated = {
        ...data,
        officeOpenHour: {
          ...(data.officeOpenHour || { id: "officeOpenHour" }),
          value: startHour,
        },
        officeCloseHour: {
          ...(data.officeCloseHour || { id: "officeCloseHour" }),
          value: endHour,
        },
        officeDays: {
          ...(data.officeDays || { id: "officeDays" }),
          value: translatedDays.join(","), 
        },
      };

      const upserts = Object.entries(updated)
        .filter(([key, entry]) => entry && typeof entry.value !== 'undefined') 
        .map(([key, entry]) => ({
          key: key,
          value: entry.value, 
          tenant_id: user.tenant_id,
      }));

      if (upserts.length === 0) {
        console.log("No data to save.");
        setSaving(false);
        return;
      }
      
      console.log("Upserting settings:", upserts);
      const { error } = await supabase
        .from("platform_settings")
        .upsert(upserts, { onConflict: "key,tenant_id" }); 

      if (error) throw error;
      
      const newData = { ...updated };
      if (newData.officeDays) {
          newData.officeDays = { ...newData.officeDays, value: translatedDays.join(",") };
      }
      setData(newData);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Save failed", err);
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

  if (authLoading) return <p>Loading user data...</p>;
  if (!user) return <p>User not found. Please log in to manage company settings.</p>;
  if (settingsLoading && user.tenant_id) return <p>Loading settings...</p>; 
  if (!user.tenant_id && !settingsLoading) return <p>Tenant information is missing. Cannot load or save settings.</p>;


  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Basic Company Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={data.company_name?.value || ""}
                onChange={(e) => handleChange("company_name", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="business_type">Business Type</Label>
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
              <Label htmlFor="primary_contact">Primary Contact Name</Label>
              <Input
                id="primary_contact"
                value={data.primaryContact?.value || ""}
                onChange={(e) => handleChange("primary_contact", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={data.phone?.value || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">Support Email Address</Label>
              <Input
                id="email"
                value={data.email?.value || ""}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="timezone">Time Zone</Label>
              <Input
                id="timezone"
                value={data.timezone?.value || ""}
                onChange={(e) => handleChange("timezone", e.target.value)}
              />
            </div>

            <div>
              <Label>Opening Time</Label>
              <select
                className="w-full border rounded px-3 py-2"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
              >
                <option value="">Select</option>
                {hourOptions.map((hr) => (
                  <option key={hr.value} value={hr.value}>
                    {hr.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Closing Time</Label>
              <select
                className="w-full border rounded px-3 py-2"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
              >
                <option value="">Select</option>
                {closingHourOptions.map((hr) => (
                  <option key={hr.value} value={hr.value}>
                    {hr.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <Label>Active Days</Label>
              <select
                className="w-full border rounded px-3 py-2"
                value={dayPreset}
                onChange={(e) => setDayPreset(e.target.value)}
              >
                <option value="">Select</option>
                {dayOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea
                id="address"
                value={data.address?.value || ""}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="regions">Service Areas / Regions</Label>
              <Textarea
                id="regions"
                value={data.regions?.value || ""}
                onChange={(e) => handleChange("regions", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2 items-center space-x-4"> 
        {/* Added space-x-4 for spacing between button and message */}
        <Button
          onClick={handleSave}
          disabled={saving || user?.role !== 'admin' || settingsLoading || authLoading}
          aria-disabled={saving || user?.role !== 'admin' || settingsLoading || authLoading}
        >
          {saving ? "Saving..." : saveSuccess ? "Saved ✅" : "Save Settings"}
        </Button>
        {user?.role !== 'admin' && !authLoading && !settingsLoading && (
          <p className="text-sm text-red-500" role="alert"> {/* Removed mr-4, relies on space-x from parent */}
            Save disabled: Admin role required.
          </p>
        )}
      </div>
    </div>
  );
}
