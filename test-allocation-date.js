// Test script for allocation date synchronization
import axios from 'axios';

// Test updating an allocation with a new date
async function testAllocationDateUpdate() {
  try {
    // First, get a list of allocations to find one to update
    const response = await axios.get('http://localhost:5000/api/allocations');
    
    if (response.data && response.data.length > 0) {
      const allocation = response.data[0];
      console.log('Found allocation to update:', allocation);
      
      // Now update the allocation with a new date
      const newDate = new Date();
      console.log(`Updating allocation ${allocation.id} with new date: ${newDate.toISOString()}`);
      
      const updateResponse = await axios.patch(`http://localhost:5000/api/allocations/${allocation.id}/date`, {
        allocationDate: newDate
      });
      
      console.log('Update response:', updateResponse.data);
      console.log('Date synchronization successful!');
    } else {
      console.log('No allocations found to test with');
    }
  } catch (error) {
    console.error('Error testing allocation date update:', error.response ? error.response.data : error.message);
  }
}

// Run the test
testAllocationDateUpdate();
