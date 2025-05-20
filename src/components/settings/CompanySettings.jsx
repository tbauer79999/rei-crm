import React, { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectItem } from "../ui/select";
import { Card, CardContent } from "../ui/card";

export default function CompanySettings() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [dayPreset, setDayPreset] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        setData(json);

        const open = json.officeOpenHour?.value || "";
        const close = json.officeCloseHour?.value || "";
        const days = json.officeDays?.value || [];

        setStartHour(open);
        setEndHour(close);

        if (Array.isArray(days)) {
          if (days.length === 7) setDayPreset("Everyday");
          else if (days.length === 6 && !days.includes("Sunday")) setDayPreset("M–Sat");
          else if (days.length === 5 && days.includes("Monday") && days.includes("Friday")) setDayPreset("M–F");
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const dayMap = {
        "M–F": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "M–Sat": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "Everyday": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      };

      const translatedDays = dayMap[dayPreset] || [];

      const updated = {
        ...data,
        officeOpenHour: {
          ...(data.officeOpenHour || {}),
          value: startHour,
        },
        officeCloseHour: {
          ...(data.officeCloseHour || {}),
          value: endHour,
        },
        officeDays: {
          ...(data.officeDays || {}),
          value: translatedDays,
        },
      };

      const flattened = {};
      for (const key in updated) {
        const entry = updated[key];
        flattened[key] = {
          id: entry.id,
          value: Array.isArray(entry.value)
            ? entry.value.join(",")
            : typeof entry.value === "boolean"
            ? String(entry.value)
            : entry.value,
        };
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flattened),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      setData(updated);
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

  if (loading) return <p>Loading settings...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Basic Company Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={data.companyName?.value || ""}
                onChange={(e) => handleChange("companyName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={data.industry?.value || ""}
                onChange={(e) => handleChange("industry", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tagline">Company Tagline</Label>
              <Input
                id="tagline"
                value={data.tagline?.value || ""}
                onChange={(e) => handleChange("tagline", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="logoUpload">Company Logo Upload</Label>
              <Input
                id="logoUpload"
                type="file"
                disabled
                placeholder="Coming soon"
              />
            </div>
            <div>
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                defaultValue={data.businessType?.value || ""}
                onChange={(val) => handleChange("businessType", val)}
              >
                <SelectItem value="llc">LLC</SelectItem>
                <SelectItem value="corp">Corporation</SelectItem>
                <SelectItem value="sole">Sole Proprietor</SelectItem>
                <SelectItem value="nonprofit">Nonprofit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </Select>
            </div>
            <div>
              <Label htmlFor="primaryContact">Primary Contact Name</Label>
              <Input
                id="primaryContact"
                value={data.primaryContact?.value || ""}
                onChange={(e) => handleChange("primaryContact", e.target.value)}
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
              <Label htmlFor="website">Business Website</Label>
              <Input
                id="website"
                value={data.website?.value || ""}
                onChange={(e) => handleChange("website", e.target.value)}
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
              <Label htmlFor="statuses">Acceptable Lead Statuses</Label>
              <Input
                id="statuses"
                value={data.statuses?.value || ""}
                onChange={(e) => handleChange("statuses", e.target.value)}
              />
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

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-black text-white px-4 py-2 rounded-md shadow hover:bg-gray-800 transition"
        >
          {saving ? "Saving..." : saveSuccess ? "Saved ✅" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
