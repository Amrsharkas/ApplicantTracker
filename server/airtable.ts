import Airtable from 'airtable';

// Configure Airtable
const AIRTABLE_API_KEY = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
const AIRTABLE_BASE_ID = 'app3tA4UpKQCT2s17'; // platouserprofiles base
const TABLE_NAME = 'Table 1';

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
  userId: string;
}

export class AirtableService {
  async storeUserProfile(name: string, profileData: any, userId: string): Promise<void> {
    if (!base) {
      console.warn('Airtable not configured, skipping profile storage');
      return;
    }

    try {
      const profileString = JSON.stringify(profileData, null, 2);
      
      // Try to store with User ID field first
      try {
        await base!(TABLE_NAME).create([
          {
            fields: {
              'Name': name,
              'User profile': profileString,
              'User ID': userId
            }
          }
        ]);
        console.log(`Successfully stored profile for ${name} (ID: ${userId}) in Airtable`);
      } catch (userIdError) {
        // If User ID field doesn't exist, store without it
        console.warn('User ID field not found, storing without User ID:', userIdError.message);
        await base!(TABLE_NAME).create([
          {
            fields: {
              'Name': name,
              'User profile': profileString
            }
          }
        ]);
        console.log(`Successfully stored profile for ${name} in Airtable (without User ID field)`);
      }
    } catch (error) {
      console.error('Error storing profile in Airtable:', error);
      throw new Error('Failed to store profile in Airtable');
    }
  }

  async getAllUserProfiles(): Promise<AirtableUserProfile[]> {
    if (!base) {
      console.warn('Airtable not configured, returning empty array');
      return [];
    }

    try {
      const records = await base!(TABLE_NAME).select({
        maxRecords: 100,
        view: 'Grid view'
      }).all();

      return records.map((record: any) => ({
        name: record.fields['Name'] || 'Unknown',
        userProfile: record.fields['User profile'] || 'No profile data',
        userId: record.fields['User ID'] || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching user profiles from Airtable:', error);
      throw new Error('Failed to fetch profiles from Airtable');
    }
  }
}

export const airtableService = new AirtableService();