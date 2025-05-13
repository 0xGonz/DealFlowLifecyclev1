import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requireAuth } from '../utils/auth';
import { requirePermission } from '../utils/permissions';

const router = Router();

// Get all users
router.get('/', requireAuth, requirePermission('view', 'user'), userController.getAllUsers.bind(userController));

// Get current user
router.get('/me', requireAuth, userController.getCurrentUser.bind(userController));

// Get user by ID
router.get('/:id', requireAuth, requirePermission('view', 'user'), userController.getUserById.bind(userController));

// Create a new user
router.post('/', 
  requireAuth,
  requirePermission('create', 'user'), 
  userController.createUser.bind(userController)
);

// Update a user
router.patch('/:id', 
  requireAuth,
  requirePermission('edit', 'user'), 
  userController.updateUser.bind(userController)
);

// Delete a user
router.delete('/:id', 
  requireAuth,
  requirePermission('delete', 'user'), 
  userController.deleteUser.bind(userController)
);

export default router;