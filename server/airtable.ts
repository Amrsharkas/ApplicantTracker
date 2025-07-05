interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: any;
  };
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface AirtableUserProfile {
  name: string;
  userProfile: string;
}

export class AirtableService {
  private apiKey: string;
  private baseUrl: string = 'https://api.airtable.com/v0';
  private baseId: string = 'app3tA4UpKQCT2s17'; // platouserprofiles base
  private tableName: string = 'Table 1';

  constructor() {
    this.apiKey = 'pat770a3TZsbDther.a2b72657b27da4390a5215e27f053a3f0a643d66b43168adb6817301ad5051c0';
  }

  async getAllCandidateProfiles(): Promise<any[]> {
    try {
      let allRecords: AirtableRecord[] = [];
      let offset: string | undefined;

      do {
        const url = `${this.baseUrl}/${this.baseId}/${this.tableName}${offset ? `?offset=${offset}` : ''}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
        }

        const data: AirtableResponse = await response.json();
        allRecords = allRecords.concat(data.records);
        offset = data.offset;

      } while (offset);

      // Filter out empty records and transform to candidate profiles
      return allRecords
        .filter(record => Object.keys(record.fields).length > 0)
        .map(record => {
          const userProfile = record.fields['User profile'] || record.fields['user profile'] || '';
          
          return {
            id: record.id,
            name: record.fields.Name || record.fields.name || 'Unknown',
            userProfile: userProfile,
            location: this.extractFromProfile(userProfile, 'location'),
            background: this.extractFromProfile(userProfile, 'background'),
            skills: this.extractFromProfile(userProfile, 'skills'),
            interests: this.extractFromProfile(userProfile, 'interests'),
            experience: this.extractFromProfile(userProfile, 'experience'),
            createdTime: record.createdTime,
            rawData: record.fields,
          };
        });

    } catch (error) {
      console.error('Error fetching candidates from Airtable:', error);
      throw error;
    }
  }

  // Extract data from user profile text
  private extractFromProfile(profile: string, field: string): string {
    if (!profile) return '';
    
    const lines = profile.split('\n').map(line => line.trim());
    
    switch (field.toLowerCase()) {
      case 'location':
        const locationLine = lines.find(line => line.toLowerCase().startsWith('location:'));
        return locationLine ? locationLine.replace(/^location:\s*/i, '').trim() : '';
      
      case 'background':
        const backgroundLine = lines.find(line => line.toLowerCase().startsWith('background:'));
        return backgroundLine ? backgroundLine.replace(/^background:\s*/i, '').trim() : '';
      
      case 'skills':
        const skillsIndex = lines.findIndex(line => line.toLowerCase().includes('skills:'));
        if (skillsIndex !== -1) {
          let skillsText = '';
          for (let i = skillsIndex; i < lines.length; i++) {
            const line = lines[i];
            if (i === skillsIndex) {
              skillsText += line.replace(/^.*skills:\s*/i, '').trim();
            } else if (line.includes(':') && !line.toLowerCase().includes('skills')) {
              break;
            } else {
              skillsText += ' ' + line.trim();
            }
          }
          return skillsText.trim();
        }
        return '';
      
      case 'interests':
        const interestsLine = lines.find(line => line.toLowerCase().includes('interests:'));
        return interestsLine ? interestsLine.replace(/^.*interests:\s*/i, '').trim() : '';
      
      case 'experience':
        const expMatch = profile.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
        return expMatch ? expMatch[1] + ' years' : '';
      
      default:
        return '';
    }
  }

  async storeUserProfile(name: string, profileData: any): Promise<void> {
    console.log('Storing profile in Airtable...');
    
    try {
      const profileString = typeof profileData === 'string' ? profileData : JSON.stringify(profileData, null, 2);
      
      const url = `${this.baseUrl}/${this.baseId}/${this.tableName}`;
      
      const recordData = {
        fields: {
          'Name': name,
          'User profile': profileString
        }
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [recordData] })
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      console.log(`Successfully stored profile for ${name} in Airtable`);
    } catch (error) {
      console.error('Error storing profile in Airtable:', error);
      throw new Error('Failed to store profile in Airtable');
    }
  }

  // Get all available Airtable bases
  async getBases(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/meta/bases`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.bases || [];
    } catch (error) {
      console.error('Error fetching Airtable bases:', error);
      throw error;
    }
  }

  // Get tables in a specific base
  async getTables(baseId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/meta/bases/${baseId}/tables`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.tables || [];
    } catch (error) {
      console.error('Error fetching Airtable tables:', error);
      throw error;
    }
  }

  async addTestProfile(): Promise<void> {
    try {
      await this.storeUserProfile('Platotester', 'Test profile data for verification');
      console.log('Test profile added successfully');
    } catch (error) {
      console.error('Failed to add test profile:', error);
      throw error;
    }
  }

  async testConnection(): Promise<void> {
    try {
      console.log('Testing Airtable connection...');
      console.log('Base ID:', this.baseId);
      console.log('Table Name:', this.tableName);
      
      // Try to read records to test the connection
      const url = `${this.baseUrl}/${this.baseId}/${encodeURIComponent(this.tableName)}?maxRecords=1`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Airtable API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Connection successful! Records found:', data.records.length);
      
      if (data.records.length > 0) {
        console.log('Sample record fields:', Object.keys(data.records[0].fields));
      }
    } catch (error) {
      console.error('❌ Connection failed:', error);
      throw error;
    }
  }
}

export const airtableService = new AirtableService();