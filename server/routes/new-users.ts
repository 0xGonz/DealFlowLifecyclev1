import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requirePermission } from '../utils/permissions';

const router = Router();

// Get all users
router.get('/', requirePermission('view', 'user'), userController.getAllUsers.bind(userController));

// Get current user
router.get('/me', userController.getCurrentUser.bind(userController));

// Get user by ID
router.get('/:id', requirePermission('view', 'user'), userController.getUserById.bind(userController));

// Create a new user
router.post('/', 
  requirePermission('create', 'user'), 
  userController.createUser.bind(userController)
);

// Update a user
router.patch('/:id', 
  requirePermission('edit', 'user'), 
  userController.updateUser.bind(userController)
);

// Delete a user
router.delete('/:id', 
  requirePermission('delete', 'user'), 
  userController.deleteUser.bind(userController)
);

export default router;