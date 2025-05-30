import { updateAllocationStatusBasedOnCapitalCalls } from '../routes/capital-calls';
import { StorageFactory } from '../storage-factory';

// Mock the storage methods
jest.mock('../storage-factory', () => ({
  StorageFactory: {
    storage: {
      getFundAllocation: jest.fn(),
      getCapitalCallsByAllocation: jest.fn(),
      updateFundAllocation: jest.fn()
    }
  }
}));

describe('updateAllocationStatusBasedOnCapitalCalls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update allocation status to "funded" when all capital is called and paid', async () => {
    const mockAllocation = {
      id: 1,
      status: 'committed',
      amount: 100000
    };

    const mockCapitalCalls = [
      { status: 'paid', callAmount: 50000, paidAmount: 50000 },
      { status: 'paid', callAmount: 50000, paidAmount: 50000 }
    ];

    (StorageFactory.storage.getFundAllocation as jest.Mock).mockResolvedValue(mockAllocation);
    (StorageFactory.storage.getCapitalCallsByAllocation as jest.Mock).mockResolvedValue(mockCapitalCalls);

    await updateAllocationStatusBasedOnCapitalCalls(1);

    expect(StorageFactory.storage.updateFundAllocation).toHaveBeenCalledWith(1, { status: 'funded' });
  });

  it('should update allocation status to "committed" when some capital is called but not fully paid', async () => {
    const mockAllocation = {
      id: 1,
      status: 'funded', // Was previously funded
      amount: 100000
    };

    const mockCapitalCalls = [
      { status: 'paid', callAmount: 50000, paidAmount: 50000 },
      { status: 'called', callAmount: 50000, paidAmount: 0 }
    ];

    (StorageFactory.storage.getFundAllocation as jest.Mock).mockResolvedValue(mockAllocation);
    (StorageFactory.storage.getCapitalCallsByAllocation as jest.Mock).mockResolvedValue(mockCapitalCalls);

    await updateAllocationStatusBasedOnCapitalCalls(1);

    expect(StorageFactory.storage.updateFundAllocation).toHaveBeenCalledWith(1, { status: 'committed' });
  });

  it('should not update allocation status when it would remain the same', async () => {
    const mockAllocation = {
      id: 1,
      status: 'committed',
      amount: 100000
    };

    const mockCapitalCalls = [
      { status: 'called', callAmount: 50000, paidAmount: 0 },
      { status: 'scheduled', callAmount: 50000, paidAmount: null }
    ];

    (StorageFactory.storage.getFundAllocation as jest.Mock).mockResolvedValue(mockAllocation);
    (StorageFactory.storage.getCapitalCallsByAllocation as jest.Mock).mockResolvedValue(mockCapitalCalls);

    await updateAllocationStatusBasedOnCapitalCalls(1);

    expect(StorageFactory.storage.updateFundAllocation).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    (StorageFactory.storage.getFundAllocation as jest.Mock).mockRejectedValue(new Error('Database error'));

    await updateAllocationStatusBasedOnCapitalCalls(1);

    expect(consoleSpy).toHaveBeenCalled();
    expect(StorageFactory.storage.updateFundAllocation).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});
