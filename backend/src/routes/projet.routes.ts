import express from 'express';
import { ProjetController } from '../controllers/projet.controller.js';
import { handleMulterError, upload } from '../middleware/upload.js';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques (lecture seule)
router.get('/', optionalAuthMiddleware, ProjetController.getAllProjets);
router.get('/all', optionalAuthMiddleware, ProjetController.getAllProjetsNoPage);
router.get('/:id', optionalAuthMiddleware, ProjetController.getProjetById);

// Routes protégées
// Route de soumission de projet avec fichiers (multer accepte tous les champs)
router.post(
  '/submit',
  authMiddleware,
  upload.any(), // Accepte n'importe quel fichier
  handleMulterError,
  ProjetController.submitProject
);
router.get('/my-project', authMiddleware, ProjetController.getMyProject); // Récupérer le projet de l'utilisateur
router.get('/my-collaborateurs', authMiddleware, ProjetController.getMyCollaborateurs); // Liste des collaborateurs de l'utilisateur
router.post('/:projetId/collaborateurs', authMiddleware, ProjetController.addCollaborateur); // Ajouter un collaborateur
router.delete('/collaborateurs/:collaborateurId', authMiddleware, ProjetController.deleteCollaborateur); // Supprimer un collaborateur
router.post('/createProjet', authMiddleware, ProjetController.createProjet);
router.get('/user', authMiddleware, ProjetController.getProjetByUser);
router.put('/:id', authMiddleware, ProjetController.updateProjet);
router.patch('/:id', authMiddleware, ProjetController.partialUpdateProjet);
router.delete('/:id', authMiddleware, ProjetController.deleteProjet);

export default router;
