import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requireAuth } from '../utils/auth';


const router = Router();

// Get all users

// Get current user
router.get('/me', requireAuth, userController.getCurrentUser.bind(userController));

// Get user by ID

// Create a new user
router.post('/', 
  requireAuth,
  userController.createUser.bind(userController)
);

// Update a user
router.patch('/:id', 
  requireAuth,
  userController.updateUser.bind(userController)
);

// Delete a user
router.delete('/:id', 
  requireAuth,
  userController.deleteUser.bind(userController)
);

export default router;