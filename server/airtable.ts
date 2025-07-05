import Airtable from 'airtable';

// Configure Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID; // You'll need to provide this
const TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'platouserprofiles';

if (!AIRTABLE_BASE_ID) {
  console.warn('AIRTABLE_BASE_ID not configured. Airtable integration will be disabled.');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: AIRTABLE_API_KEY
});

const base = AIRTABLE_BASE_ID ? Airtable.base(AIRTABLE_BASE_ID) : null;

export interface AirtableUserProfile {
  name: string;
  userProfile: string;
}

export class AirtableService {
  async storeUserProfile(name: string, profileData: any): Promise<void> {
    if (!base) {
      console.warn('Airtable not configured, skipping profile storage');
      return;
    }

    try {
      const profileString = JSON.stringify(profileData, null, 2);
      
      await base!(TABLE_NAME).create([
        {
          fields: {
            'Name': name,
            'User Profile': profileString
          }
        }
      ]);

      console.log(`Successfully stored profile for ${name} in Airtable`);
    } catch (error) {
      console.error('Error storing profile in Airtable:', error);
      throw new Error('Failed to store profile in Airtable');
    }
  }
}

export const airtableService = new AirtableService();