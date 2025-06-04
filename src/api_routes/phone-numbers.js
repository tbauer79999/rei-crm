// routes/phone-numbers.js
const express = require('express');
const twilio = require('twilio');
const { supabase } = require('../../supabaseClient');
const router = express.Router();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Search available phone numbers by area code
router.get('/search/:areaCode', async (req, res) => {
  try {
    const { areaCode } = req.params;
    const { limit = 20 } = req.query;

    // Validate area code
    if (!areaCode || areaCode.length !== 3 || !/^\d{3}$/.test(areaCode)) {
      return res.status(400).json({ 
        error: 'Invalid area code. Must be 3 digits.' 
      });
    }

    console.log(`Searching for phone numbers in area code: ${areaCode}`);

    // Search available phone numbers from Twilio
    const availableNumbers = await twilioClient.availablePhoneNumbers('US')
      .local
      .list({
        areaCode: areaCode,
        limit: parseInt(limit),
        voiceEnabled: true,
        smsEnabled: true
      });

    // Format the response
    const formattedNumbers = availableNumbers.map(number => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      locality: number.locality,
      region: number.region,
      capabilities: {
        voice: number.capabilities.voice,
        sms: number.capabilities.sms,
        mms: number.capabilities.mms
      },
      cost: '$1.00/month' // Standard Twilio pricing
    }));

    res.json({
      success: true,
      areaCode,
      availableNumbers: formattedNumbers,
      count: formattedNumbers.length
    });

  } catch (error) {
    console.error('Error searching phone numbers:', error);
    res.status(500).json({ 
      error: 'Failed to search phone numbers',
      details: error.message 
    });
  }
});

// Purchase phone number and assign to user's subaccount
router.post('/purchase', async (req, res) => {
  try {
    const { phoneNumber, userId, subAccountSid } = req.body;

    if (!phoneNumber || !userId) {
      return res.status(400).json({ 
        error: 'Phone number and user ID are required' 
      });
    }

    console.log(`Purchasing phone number: ${phoneNumber} for user: ${userId}`);

    // Get or create subaccount for the user
    let userSubAccount;
    if (subAccountSid) {
      userSubAccount = await twilioClient.api.accounts(subAccountSid).fetch();
    } else {
      // Create new subaccount for user
      const { data: userData } = await supabase
  .from('users_profile')  // ✅ Correct table
  .select('tenant_id')  // Get the data that actually exists
  .eq('id', userId)
  .single();

      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      userSubAccount = await twilioClient.api.accounts.create({
        friendlyName: `${userData.company_name || userData.email} - AI Outreach`
      });

      // Save subaccount SID to user record
      await supabase
        .from('users')
        .update({ twilio_subaccount_sid: userSubAccount.sid })
        .eq('id', userId);
    }

    // Purchase the phone number using the subaccount
    const subAccountClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      { accountSid: userSubAccount.sid }
    );

    const purchasedNumber = await subAccountClient.incomingPhoneNumbers.create({
  phoneNumber: phoneNumber
  // No webhook URLs for now - can add later when you have a public URL
});
    // Save phone number to database
    const { data: phoneRecord, error: dbError } = await supabase
      .from('phone_numbers')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        twilio_sid: purchasedNumber.sid,
        twilio_subaccount_sid: userSubAccount.sid,
        status: 'active',
        capabilities: {
          voice: purchasedNumber.capabilities.voice,
          sms: purchasedNumber.capabilities.sms,
          mms: purchasedNumber.capabilities.mms
        },
        purchased_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up - release the number if DB save failed
      await subAccountClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
      throw dbError;
    }

    // Update user's onboarding status
    await supabase
  .from('users_profile')  // ✅ Correct table
  .update({ 
    phone_number_configured: true
  })
  .eq('id', userId);

    res.json({
      success: true,
      phoneNumber: purchasedNumber.phoneNumber,
      twilioSid: purchasedNumber.sid,
      subAccountSid: userSubAccount.sid,
      phoneRecord: phoneRecord,
      message: 'Phone number purchased and configured successfully'
    });

  } catch (error) {
    console.error('Error purchasing phone number:', error);
    res.status(500).json({ 
      error: 'Failed to purchase phone number',
      details: error.message 
    });
  }
});

// Get user's phone numbers
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: phoneNumbers, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    res.json({
      success: true,
      phoneNumbers
    });

  } catch (error) {
    console.error('Error fetching user phone numbers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch phone numbers',
      details: error.message 
    });
  }
});

// Release/delete phone number
router.delete('/:phoneNumberSid', async (req, res) => {
  try {
    const { phoneNumberSid } = req.params;
    const { userId } = req.body;

    // Get phone number record
    const { data: phoneRecord, error: fetchError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('twilio_sid', phoneNumberSid)
      .eq('user_id', userId)
      .single();

    if (fetchError || !phoneRecord) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    // Release number from Twilio
    const subAccountClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      { accountSid: phoneRecord.twilio_subaccount_sid }
    );

    await subAccountClient.incomingPhoneNumbers(phoneNumberSid).remove();

    // Update database
    await supabase
      .from('phone_numbers')
      .update({ 
        status: 'released',
        released_at: new Date().toISOString()
      })
      .eq('twilio_sid', phoneNumberSid);

    res.json({
      success: true,
      message: 'Phone number released successfully'
    });

  } catch (error) {
    console.error('Error releasing phone number:', error);
    res.status(500).json({ 
      error: 'Failed to release phone number',
      details: error.message 
    });
  }
});

// Get popular area codes with availability
router.get('/popular-area-codes', async (req, res) => {
  try {
    const popularAreaCodes = [
      { code: '212', city: 'New York, NY', region: 'Manhattan' },
      { code: '310', city: 'Los Angeles, CA', region: 'West LA' },
      { code: '312', city: 'Chicago, IL', region: 'Downtown' },
      { code: '305', city: 'Miami, FL', region: 'Miami-Dade' },
      { code: '617', city: 'Boston, MA', region: 'Boston Metro' },
      { code: '713', city: 'Houston, TX', region: 'Houston Metro' },
      { code: '415', city: 'San Francisco, CA', region: 'SF Bay Area' },
      { code: '202', city: 'Washington, DC', region: 'District' },
      { code: '404', city: 'Atlanta, GA', region: 'Atlanta Metro' },
      { code: '206', city: 'Seattle, WA', region: 'Seattle Metro' }
    ];

    // Check availability for each area code (sample 3 numbers)
    const areaCodesWithAvailability = await Promise.all(
      popularAreaCodes.map(async (areaCode) => {
        try {
          const availableNumbers = await twilioClient.availablePhoneNumbers('US')
            .local
            .list({
              areaCode: areaCode.code,
              limit: 3
            });

          return {
            ...areaCode,
            available: availableNumbers.length > 0,
            count: availableNumbers.length
          };
        } catch (error) {
          return {
            ...areaCode,
            available: false,
            count: 0
          };
        }
      })
    );

    res.json({
      success: true,
      areaCodes: areaCodesWithAvailability
    });

  } catch (error) {
    console.error('Error fetching popular area codes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch area codes',
      details: error.message 
    });
  }
});

module.exports = router;