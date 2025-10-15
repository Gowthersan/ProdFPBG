import { Router, Response, NextFunction } from 'express';
import demandeSubventionService from '../services/demandeSubvention.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

/**
 * @route   POST /api/demandes
 * @desc    Créer une nouvelle demande de subvention
 * @access  Privé (utilisateur authentifié)
 */
router.post('/', authenticate, async (req, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new Error('Authentification requise.');
    const idUtilisateur = authReq.user.userId;
    const demande = await demandeSubventionService.creer(authReq.body, idUtilisateur);

    res.status(201).json({
      message: 'Demande créée avec succès.',
      data: demande
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/demandes
 * @desc    Récupérer toutes les demandes (admin) ou filtrer
 * @access  Privé (authentifié)
 */
router.get('/', authenticate, async (req, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new Error('Authentification requise.');
    const filtres = {
      statut: authReq.query.statut as string,
      typeSoumission: authReq.query.typeSoumission as string,
      idOrganisation: authReq.query.idOrganisation as string,
      idAppelProjets: authReq.query.idAppelProjets as string
    };

    const demandes = await demandeSubventionService.obtenirTout(filtres);

    res.status(200).json({
      message: 'Demandes récupérées avec succès.',
      data: demandes
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/demandes/mes-demandes
 * @desc    Récupérer les demandes de l'utilisateur connecté
 * @access  Privé (utilisateur authentifié)
 */
router.get('/mes-demandes', authenticate, async (req, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new Error('Authentification requise.');
    const idUtilisateur = authReq.user.userId;
    const demandes = await demandeSubventionService.obtenirParUtilisateur(idUtilisateur);

    res.status(200).json({
      message: 'Vos demandes récupérées avec succès.',
      data: demandes
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/demandes/statistiques
 * @desc    Récupérer les statistiques (dashboard admin)
 * @access  Privé (admin)
 */
router.get('/statistiques', authenticate, async (req, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'ADMINISTRATEUR') {
      res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
      return;
    }
    const stats = await demandeSubventionService.obtenirStatistiques();

    res.status(200).json({
      message: 'Statistiques récupérées avec succès.',
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/demandes/:id
 * @desc    Récupérer une demande par ID
 * @access  Privé (utilisateur authentifié)
 */
router.get('/:id', authenticate, async (req, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new Error('Authentification requise.');
    const { id } = authReq.params;
    const idUtilisateur = authReq.user.userId;
    const demande = await demandeSubventionService.obtenirParId(id!, idUtilisateur);

    res.status(200).json({
      message: 'Demande récupérée avec succès.',
      data: demande
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/demandes/:id
 * @desc    Mettre à jour une demande
 * @access  Privé (propriétaire de la demande)
 */
router.put('/:id', authenticate, async (req, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new Error('Authentification requise.');
    const { id } = authReq.params;
    const idUtilisateur = authReq.user.userId;
    const demande = await demandeSubventionService.mettreAJour(id!, authReq.body, idUtilisateur);

    res.status(200).json({
      message: 'Demande mise à jour avec succès.',
      data: demande
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/demandes/:id/statut
 * @desc    Changer le statut d'une demande (admin uniquement)
 * @access  Privé (admin)
 */
router.patch('/:id/statut', authenticate, async (req, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || authReq.user.role !== 'ADMINISTRATEUR') {
      res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
      return;
    }
    const { id } = authReq.params;
    const { statut } = authReq.body;
    const idAdmin = authReq.user.userId;

    const demande = await demandeSubventionService.changerStatut(id!, statut, idAdmin);

    res.status(200).json({
      message: 'Statut modifié avec succès.',
      data: demande
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/demandes/:id
 * @desc    Supprimer une demande
 * @access  Privé (propriétaire de la demande)
 */
router.delete('/:id', authenticate, async (req, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new Error('Authentification requise.');
    const { id } = authReq.params;
    const idUtilisateur = authReq.user.userId;
    const result = await demandeSubventionService.supprimer(id!, idUtilisateur);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
