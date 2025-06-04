import React, { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Card, CardContent } from "../ui/card";
import { Textarea } from "../ui/textarea";

export default function DataSettings() {
  const [autoBackup, setAutoBackup] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Data & Backup Settings</h2>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoBackup">Enable Daily Auto-Backup</Label>
            <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
          </div>

          <div>
            <Label htmlFor="backupEmail">Backup Delivery Email</Label>
            <Input id="backupEmail" placeholder="you@company.com" />
          </div>

          <div>
            <Label htmlFor="retention">Backup Retention Policy (days)</Label>
            <Input id="retention" type="number" placeholder="30" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Advanced Export Rules</h2>
            <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
          </div>

          {showAdvanced && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="exportFormat">Custom Export Format (CSV Headers)</Label>
                <Textarea
                  id="exportFormat"
                  placeholder="firstName,lastName,phone,status,notes"
                />
              </div>

              <div>
                <Label htmlFor="externalStorage">External Storage Webhook URL</Label>
                <Input
                  id="externalStorage"
                  placeholder="https://hooks.zapier.com/..."
                />
              </div>

              <div>
                <Label htmlFor="sensitiveFields">Sensitive Fields to Redact</Label>
                <Input
                  id="sensitiveFields"
                  placeholder="ssn,creditScore,bankAccount"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}