import express from 'express';
import { ProjetController } from '../controllers/projet.controller.js';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques (lecture seule)
router.get('/', optionalAuthMiddleware, ProjetController.getAllProjets);
router.get('/all', optionalAuthMiddleware, ProjetController.getAllProjetsNoPage);
router.get('/:id', optionalAuthMiddleware, ProjetController.getProjetById);

// Routes protégées
router.post('/createProjet', authMiddleware, ProjetController.createProjet);
router.get('/user', authMiddleware, ProjetController.getProjetByUser);
router.put('/:id', authMiddleware, ProjetController.updateProjet);
router.patch('/:id', authMiddleware, ProjetController.partialUpdateProjet);
router.delete('/:id', authMiddleware, ProjetController.deleteProjet);

export default router;
