// Direct test of the date integration utilities
import { synchronizeAllocationDates } from './server/utils/date-integration.js';
import { StorageFactory } from './server/storage-factory.js';

async function testDateIntegration() {
  try {
    console.log('Getting allocations...');
    const allocations = await StorageFactory.storage.getAllocations();
    
    if (allocations && allocations.length > 0) {
      const allocation = allocations[0];
      console.log('Testing with allocation:', allocation);
      
      const newDate = new Date();
      console.log(`Synchronizing allocation ${allocation.id} with new date: ${newDate.toISOString()}`);
      
      const result = await synchronizeAllocationDates(allocation.id, newDate);
      console.log('Synchronization result:', result);
      
      if (result) {
        // Check that the allocation was updated
        const updatedAllocation = await StorageFactory.storage.getFundAllocation(allocation.id);
        console.log('Updated allocation:', updatedAllocation);
        
        // Check related capital calls
        const capitalCalls = await StorageFactory.storage.getCapitalCallsByAllocation(allocation.id);
        console.log('Related capital calls:', capitalCalls);
        
        // Check related closing events
        const closingEvents = await StorageFactory.storage.getClosingScheduleEventsByDeal(allocation.dealId);
        console.log('Related closing events:', closingEvents);
      }
    } else {
      console.log('No allocations found to test with');
    }
  } catch (error) {
    console.error('Error testing date integration:', error);
  }
}

// Run the test
testDateIntegration();
