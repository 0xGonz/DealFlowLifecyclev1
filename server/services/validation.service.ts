import { z } from 'zod';
import { Deal, FundAllocation, Document } from '@shared/schema';

/**
 * Enterprise Validation Service
 * Centralized business logic validation for investment platform
 */

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  /**
   * Investment amount validation
   */
  validateInvestmentAmount(amount: number, fundSize: number): { valid: boolean; message?: string } {
    if (amount <= 0) {
      return { valid: false, message: 'Investment amount must be positive' };
    }

    if (amount > fundSize) {
      return { valid: false, message: 'Investment amount cannot exceed fund size' };
    }

    // Additional business rules for investment amounts
    if (amount < 10000) {
      return { valid: false, message: 'Minimum investment amount is $10,000' };
    }

    return { valid: true };
  }

  /**
   * Deal stage transition validation
   */
  validateDealStageTransition(
    currentStage: Deal['stage'], 
    newStage: Deal['stage'], 
    userRole: string
  ): { valid: boolean; message?: string } {
    const stageOrder = [
      'initial_review',
      'screening', 
      'diligence',
      'ic_review',
      'closing',
      'invested',
      'closed',
      'rejected'
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    const newIndex = stageOrder.indexOf(newStage);

    // Allow rejection at any stage
    if (newStage === 'rejected') {
      return { valid: true };
    }

    // Prevent backward transitions (except for corrections)
    if (newIndex < currentIndex && userRole !== 'admin') {
      return { valid: false, message: 'Cannot move deal backwards in pipeline' };
    }

    // Skip stage validation for senior roles
    if (['admin', 'partner'].includes(userRole)) {
      return { valid: true };
    }

    // Enforce sequential progression for analysts
    if (newIndex > currentIndex + 1) {
      return { valid: false, message: 'Cannot skip stages in deal progression' };
    }

    return { valid: true };
  }

  /**
   * Document upload validation
   */
  validateDocumentUpload(
    file: { size: number; mimetype: string; originalname: string },
    dealStage: Deal['stage']
  ): { valid: boolean; message?: string } {
    // File size limits (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, message: 'File size exceeds 50MB limit' };
    }

    // Allowed MIME types for investment documents
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, message: 'Invalid file type for investment documents' };
    }

    // Stage-specific document requirements
    if (dealStage === 'initial_review' && !file.originalname.toLowerCase().includes('deck')) {
      return { valid: false, message: 'Initial review stage requires pitch deck' };
    }

    return { valid: true };
  }

  /**
   * Allocation validation
   */
  validateAllocation(
    allocation: Partial<FundAllocation>,
    existingAllocations: FundAllocation[],
    fundSize: number
  ): { valid: boolean; message?: string } {
    if (!allocation.amount || allocation.amount <= 0) {
      return { valid: false, message: 'Allocation amount must be positive' };
    }

    // Calculate total allocated amount
    const totalAllocated = existingAllocations
      .filter(a => a.id !== allocation.id) // Exclude current allocation if updating
      .reduce((sum, a) => sum + a.amount, 0) + allocation.amount;

    if (totalAllocated > fundSize) {
      return { 
        valid: false, 
        message: `Total allocations (${totalAllocated}) would exceed fund size (${fundSize})` 
      };
    }

    // Validate allocation date
    if (allocation.allocationDate && allocation.allocationDate > new Date()) {
      return { valid: false, message: 'Allocation date cannot be in the future' };
    }

    return { valid: true };
  }

  /**
   * Capital call validation
   */
  validateCapitalCall(
    callAmount: number,
    callPercentage: number,
    allocationAmount: number
  ): { valid: boolean; message?: string } {
    if (callAmount <= 0) {
      return { valid: false, message: 'Capital call amount must be positive' };
    }

    if (callPercentage < 0 || callPercentage > 100) {
      return { valid: false, message: 'Call percentage must be between 0 and 100' };
    }

    const expectedAmount = (allocationAmount * callPercentage) / 100;
    const tolerance = expectedAmount * 0.01; // 1% tolerance

    if (Math.abs(callAmount - expectedAmount) > tolerance) {
      return { 
        valid: false, 
        message: `Call amount (${callAmount}) does not match percentage (${callPercentage}%) of allocation` 
      };
    }

    return { valid: true };
  }

  /**
   * User role validation for operations
   */
  validateUserPermission(
    userRole: string,
    operation: string,
    resourceType: string
  ): { valid: boolean; message?: string } {
    const permissions = {
      intern: ['read'],
      analyst: ['read', 'create', 'update'],
      observer: ['read'],
      partner: ['read', 'create', 'update', 'delete'],
      admin: ['read', 'create', 'update', 'delete', 'manage']
    };

    const userPermissions = permissions[userRole as keyof typeof permissions] || [];
    
    if (!userPermissions.includes(operation)) {
      return { 
        valid: false, 
        message: `Role '${userRole}' does not have permission to '${operation}' ${resourceType}` 
      };
    }

    return { valid: true };
  }

  /**
   * Email validation for notifications
   */
  validateEmail(email: string): { valid: boolean; message?: string } {
    const emailSchema = z.string().email();
    
    try {
      emailSchema.parse(email);
      return { valid: true };
    } catch {
      return { valid: false, message: 'Invalid email format' };
    }
  }

  /**
   * Date range validation for reports
   */
  validateDateRange(startDate: Date, endDate: Date): { valid: boolean; message?: string } {
    if (startDate >= endDate) {
      return { valid: false, message: 'Start date must be before end date' };
    }

    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (endDate.getTime() - startDate.getTime() > maxRange) {
      return { valid: false, message: 'Date range cannot exceed 1 year' };
    }

    return { valid: true };
  }
}