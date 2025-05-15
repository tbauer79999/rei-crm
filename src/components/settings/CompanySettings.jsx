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

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOptionalDefaults, setShowOptionalDefaults] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        setData(json);
        setShowAdvanced(!!json.voice || !!json.tone);
        setShowOptionalDefaults(!!json.services || !!json.roles);
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

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
                value={data.companyName || ""}
                onChange={(e) => handleChange("companyName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={data.industry || ""}
                onChange={(e) => handleChange("industry", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tagline">Company Tagline</Label>
              <Input
                id="tagline"
                value={data.tagline || ""}
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
                onChange={(val) => handleChange("businessType", val)}
                defaultValue={data.businessType}
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
                value={data.primaryContact || ""}
                onChange={(e) =>
                  handleChange("primaryContact", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={data.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Support Email Address</Label>
              <Input
                id="email"
                value={data.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="website">Business Website</Label>
              <Input
                id="website"
                value={data.website || ""}
                onChange={(e) => handleChange("website", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="timezone">Time Zone</Label>
              <Input
                id="timezone"
                value={data.timezone || ""}
                onChange={(e) => handleChange("timezone", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="hours">Office Hours</Label>
              <Input
                id="hours"
                value={data.hours || ""}
                onChange={(e) => handleChange("hours", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea
                id="address"
                value={data.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="regions">Service Areas / Regions</Label>
              <Textarea
                id="regions"
                value={data.regions || ""}
                onChange={(e) => handleChange("regions", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Platform Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campaigns">Campaigns (one per line)</Label>
              <Textarea
                id="campaigns"
                value={data["Campaigns"]?.value || ""}
                onChange={(e) =>
                  handleChange("Campaigns", {
                    ...data["Campaigns"],
                    value: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="statuses">Statuses (one per line)</Label>
              <Textarea
                id="statuses"
                value={data["Statuses"]?.value || ""}
                onChange={(e) =>
                  handleChange("Statuses", {
                    ...data["Statuses"],
                    value: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex items-center space-x-2 mt-2">
              <input
                id="aiEnabled"
                type="checkbox"
                className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                checked={data["AI Enabled"]?.value === "true"}
                onChange={(e) =>
                  handleChange("AI Enabled", {
                    ...data["AI Enabled"],
                    value: e.target.checked.toString(),
                  })
                }
              />
              <Label htmlFor="aiEnabled" className="text-sm font-medium">
                AI Enabled
              </Label>
            </div>

            <div className="flex items-center space-x-2 mt-2">
              <input
                id="followUpEnabled"
                type="checkbox"
                className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                checked={data["Follow-Up Enabled"]?.value === "true"}
                onChange={(e) =>
                  handleChange("Follow-Up Enabled", {
                    ...data["Follow-Up Enabled"],
                    value: e.target.checked.toString(),
                  })
                }
              />
              <Label htmlFor="followUpEnabled" className="text-sm font-medium">
                Follow-Up Enabled
              </Label>
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
