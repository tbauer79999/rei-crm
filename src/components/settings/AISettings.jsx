import React, { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Card, CardContent } from "../ui/card";

export default function AISettings() {
  const [enableAI, setEnableAI] = useState(true);
  const [showAdvancedAI, setShowAdvancedAI] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">AI Workflow Settings</h2>

          <div className="flex items-center justify-between">
            <Label htmlFor="enableAI">Enable AI Conversations</Label>
            <Switch checked={enableAI} onCheckedChange={setEnableAI} />
          </div>

          <div>
            <Label htmlFor="aiDelay">AI Response Delay (seconds)</Label>
            <Input id="aiDelay" type="number" placeholder="2" />
          </div>

          <div>
            <Label htmlFor="handoffThreshold">Handoff Trigger Keyword(s)</Label>
            <Input
              id="handoffThreshold"
              placeholder="interested, ready, yes, make offer"
            />
          </div>

          <div>
            <Label htmlFor="hotLeadThreshold">Hot Lead Confidence Score (%)</Label>
            <Input
              id="hotLeadThreshold"
              type="number"
              placeholder="85"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Advanced AI Behavior</h2>
            <Switch
              checked={showAdvancedAI}
              onCheckedChange={setShowAdvancedAI}
            />
          </div>

          {showAdvancedAI && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="aiPersona">AI Persona Prompt</Label>
                <Textarea
                  id="aiPersona"
                  placeholder="You are an empathetic, helpful assistant who follows up on property inquiries in a casual and respectful tone..."
                />
              </div>
              <div>
                <Label htmlFor="fallbackBehavior">Fallback Behavior</Label>
                <Textarea
                  id="fallbackBehavior"
                  placeholder="If the lead doesn't reply after 2 messages, mark as cold. If the lead opts out, tag as unsubscribed..."
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}