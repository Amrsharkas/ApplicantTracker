// Test working Airtable integration
import { airtableService } from './server/airtable.js';

async function testWorking() {
  try {
    console.log('Testing working Airtable integration...');
    await airtableService.testConnection();
    
    console.log('\nTesting Platotester profile with working field structure...');
    await airtableService.addTestProfile();
    
    console.log('✅ SUCCESS! Airtable integration is working with the available field structure!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWorking();