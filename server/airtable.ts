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
    console.log('Attempting to store profile in Airtable...');
    console.log('AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? 'configured' : 'missing');
    console.log('TABLE_NAME:', TABLE_NAME);
    
    if (!base) {
      console.warn('Airtable not configured, skipping profile storage');
      return;
    }

    try {
      const profileString = typeof profileData === 'string' ? profileData : JSON.stringify(profileData, null, 2);
      
      console.log(`Storing profile for ${name}...`);
      
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
      console.error('Full error details:', JSON.stringify(error, null, 2));
      throw new Error('Failed to store profile in Airtable');
    }
  }

  async addTestProfile(): Promise<void> {
    try {
      await this.storeUserProfile('Platotester', 'test123');
      console.log('Test profile added successfully');
    } catch (error) {
      console.error('Failed to add test profile:', error);
      throw error;
    }
  }
}

export const airtableService = new AirtableService();