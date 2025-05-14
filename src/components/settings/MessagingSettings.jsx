import React, { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Card, CardContent } from "../ui/card";

export default function MessagingSettings() {
  const [enableTextReplies, setEnableTextReplies] = useState(true);
  const [enableAutoFollowups, setEnableAutoFollowups] = useState(true);
  const [showCustomReplies, setShowCustomReplies] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Messaging Preferences</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="replyNumber">Default Reply Phone Number</Label>
              <Input id="replyNumber" placeholder="e.g. (555) 123-4567" />
            </div>
            <div>
              <Label htmlFor="replyDelay">Default Response Delay (seconds)</Label>
              <Input id="replyDelay" type="number" placeholder="3" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="enableTextReplies">Enable Text Replies</Label>
            <Switch
              checked={enableTextReplies}
              onCheckedChange={setEnableTextReplies}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="enableAutoFollowups">Enable Auto-Followups</Label>
            <Switch
              checked={enableAutoFollowups}
              onCheckedChange={setEnableAutoFollowups}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Custom AI Message Templates</h2>
            <Switch
              checked={showCustomReplies}
              onCheckedChange={setShowCustomReplies}
            />
          </div>

          {showCustomReplies && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="initialMessage">Initial Contact Message</Label>
                <Textarea
                  id="initialMessage"
                  placeholder="Hi {{firstName}}, I saw your property at {{address}}. Would you consider selling?"
                />
              </div>
              <div>
                <Label htmlFor="followupMessage">Follow-Up Message</Label>
                <Textarea
                  id="followupMessage"
                  placeholder="Just following up to see if you're still interested in selling. Let me know either way."
                />
              </div>
              <div>
                <Label htmlFor="optOutMessage">Opt-Out Message</Label>
                <Textarea
                  id="optOutMessage"
                  placeholder="No problem. You’ve been removed from our list. Best of luck with everything!"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}