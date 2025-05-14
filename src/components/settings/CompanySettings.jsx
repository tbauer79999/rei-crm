import React, { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectItem } from "../ui/select";
import { Switch } from "../ui/switch";
import { Card, CardContent } from "../ui/card";

export default function CompanySettings() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOptionalDefaults, setShowOptionalDefaults] = useState(false);

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Basic Company Info</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" placeholder="Elevated Dream Homes" />
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" placeholder="Real Estate, Legal, Healthcare..." />
            </div>

            <div>
              <Label htmlFor="tagline">Company Tagline</Label>
              <Input id="tagline" placeholder="We turn dreams into deeds." />
            </div>

            <div>
              <Label htmlFor="logoUpload">Company Logo Upload</Label>
              <Input id="logoUpload" type="file" accept="image/*" />
            </div>

            <div>
              <Label htmlFor="businessType">Business Type</Label>
              <Select>
                <SelectItem value="llc">LLC</SelectItem>
                <SelectItem value="corp">Corporation</SelectItem>
                <SelectItem value="sole">Sole Proprietor</SelectItem>
                <SelectItem value="nonprofit">Nonprofit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </Select>
            </div>

            <div>
              <Label htmlFor="primaryContact">Primary Contact Name</Label>
              <Input id="primaryContact" placeholder="John Doe" />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="(555) 123-4567" />
            </div>

            <div>
              <Label htmlFor="email">Support Email Address</Label>
              <Input id="email" placeholder="support@company.com" />
            </div>

            <div>
              <Label htmlFor="website">Business Website</Label>
              <Input id="website" placeholder="https://www.company.com" />
            </div>

            <div>
              <Label htmlFor="timezone">Time Zone</Label>
              <Input id="timezone" placeholder="America/New_York" />
            </div>

            <div>
              <Label htmlFor="hours">Office Hours</Label>
              <Input id="hours" placeholder="Mon-Fri 9am-5pm" />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea id="address" placeholder="123 Main St, Orlando, FL 32801" />
            </div>

            <div className="col-span-2">
              <Label htmlFor="regions">Service Areas / Regions</Label>
              <Textarea id="regions" placeholder="Orlando, Tampa, Miami..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Customizations */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Advanced AI Customization</h2>
            <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pronoun">AI Pronoun Usage</Label>
                <Select>
                  <SelectItem value="we">We</SelectItem>
                  <SelectItem value="i">I</SelectItem>
                  <SelectItem value="company">Company Name</SelectItem>
                </Select>
              </div>

              <div>
                <Label htmlFor="tone">Response Style</Label>
                <Select>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="voice">Brand Voice Guidelines</Label>
                <Textarea
                  id="voice"
                  placeholder="E.g., We keep it casual but professional. Avoid jargon. Sound helpful."
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="greetingFormat">Lead Greeting Format</Label>
                <Select>
                  <SelectItem value="hiFirst">Hi [First Name]</SelectItem>
                  <SelectItem value="helloFull">Hello [Full Name]</SelectItem>
                  <SelectItem value="noGreeting">No Greeting</SelectItem>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optional Defaults */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Optional Defaults (Non-RE Industries)</h2>
            <Switch checked={showOptionalDefaults} onCheckedChange={setShowOptionalDefaults} />
          </div>

          {showOptionalDefaults && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="services">Default Services Offered</Label>
                <Textarea id="services" placeholder="Consulting, Construction, Legal Advice..." />
              </div>

              <div>
                <Label htmlFor="roles">Team Member Roles</Label>
                <Textarea id="roles" placeholder="Sales, Support, Legal..." />
              </div>

              <div>
                <Label htmlFor="clientType">Client Type Served</Label>
                <Select>
                  <SelectItem value="b2b">B2B</SelectItem>
                  <SelectItem value="b2c">B2C</SelectItem>
                  <SelectItem value="gov">Government</SelectItem>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}