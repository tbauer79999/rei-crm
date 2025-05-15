import React, { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Card, CardContent } from "../ui/card";

export default function AISettings() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        setData(json);
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
        value: typeof value === "boolean" ? String(value) : value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const flattened = {};
      for (const key in data) {
        flattened[key] = {
          id: data[key].id,
          value: data[key].value,
        };
      }
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flattened),
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
          <h2 className="text-xl font-bold">AI Workflow Settings</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Switch
                id="AI Conversations Enabled"
                checked={data["AI Conversations Enabled"]?.value === "true"}
                onCheckedChange={(val) =>
                  handleChange("AI Conversations Enabled", val)
                }
              />
              <Label htmlFor="AI Conversations Enabled">
                Enable AI Conversations
              </Label>
            </div>

            <div>
              <Label htmlFor="AI Response Delay">AI Response Delay (seconds)</Label>
              <Input
                id="AI Response Delay"
                value={data["AI Response Delay"]?.value || ""}
                onChange={(e) => handleChange("AI Response Delay", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="Handoff Keywords">Handoff Trigger Keyword(s)</Label>
              <Input
                id="Handoff Keywords"
                value={data["Handoff Keywords"]?.value || ""}
                onChange={(e) => handleChange("Handoff Keywords", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="Hot Lead Confidence">Hot Lead Confidence Score (%)</Label>
              <Input
                id="Hot Lead Confidence"
                value={data["Hot Lead Confidence"]?.value || ""}
                onChange={(e) => handleChange("Hot Lead Confidence", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">AI & Automation Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="AI Greeting Message">AI Greeting Message</Label>
              <Textarea
                id="AI Greeting Message"
                value={data["AI Greeting Message"]?.value || ""}
                onChange={(e) => handleChange("AI Greeting Message", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="AI Tone of Voice">AI Tone of Voice</Label>
              <Input
                id="AI Tone of Voice"
                value={data["AI Tone of Voice"]?.value || ""}
                onChange={(e) => handleChange("AI Tone of Voice", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="AI Response Delay">AI Reply Delay (seconds)</Label>
              <Input
                id="AI Response Delay"
                value={data["AI Response Delay"]?.value || ""}
                onChange={(e) => handleChange("AI Response Delay", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="Handoff Message">Handoff Message</Label>
              <Textarea
                id="Handoff Message"
                value={data["Handoff Message"]?.value || ""}
                onChange={(e) => handleChange("Handoff Message", e.target.value)}
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
