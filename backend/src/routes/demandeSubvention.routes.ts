import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import demandeSubventionService from '../services/demandeSubvention.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

// ========================================
// Configuration Multer pour l'upload de fichiers
// ========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Dossier de destination
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Mo max par fichier
  }
});

// ========================================
// Route principale : Soumission complète du projet
// ========================================
/**
 * @route   POST /api/demandes/submit
 * @desc    Soumettre un projet complet depuis le wizard (9 étapes)
 * @access  Privé (utilisateur authentifié)
 * @body    FormData avec :
 *          - projectData (JSON stringifié)
 *          - attachment_LETTRE_MOTIVATION (File)
 *          - attachment_CV (File)
 *          - etc.
 */
router.post(
    '/submit',
    authenticate,
    upload.fields([
      { name: 'attachment_LETTRE_MOTIVATION', maxCount: 1 },
      { name: 'attachment_CV', maxCount: 1 },
      { name: 'attachment_CERTIFICAT_ENREGISTREMENT', maxCount: 1 },
      { name: 'attachment_STATUTS_REGLEMENT', maxCount: 1 },
      { name: 'attachment_PV_ASSEMBLEE', maxCount: 1 },
      { name: 'attachment_RAPPORTS_FINANCIERS', maxCount: 1 },
      { name: 'attachment_RCCM', maxCount: 1 },
      { name: 'attachment_AGREMENT', maxCount: 1 },
      { name: 'attachment_ETATS_FINANCIERS', maxCount: 1 },
      { name: 'attachment_DOCUMENTS_STATUTAIRES', maxCount: 1 },
      { name: 'attachment_RIB', maxCount: 1 },
      { name: 'attachment_LETTRES_SOUTIEN', maxCount: 1 },
      { name: 'attachment_PREUVE_NON_FAILLITE', maxCount: 1 },
      { name: 'attachment_CARTOGRAPHIE', maxCount: 1 },
      { name: 'attachment_FICHE_CIRCUIT', maxCount: 1 },
      { name: 'attachment_BUDGET_DETAILLE', maxCount: 1 },
      { name: 'attachment_CHRONOGRAMME', maxCount: 1 }
    ]),
    async (req, res: Response, next: NextFunction) => {
      try {
        const authReq = req as AuthRequest;
        if (!authReq.user) throw new Error('Authentification requise.');

        const idUtilisateur = authReq.user.userId;
        const files = authReq.files as { [fieldname: string]: Express.Multer.File[] };

        // Parser les données JSON du formulaire
        let projectData;
        try {
          projectData = JSON.parse(authReq.body.projectData);
        } catch (error) {
          return res.status(400).json({
            message: 'Données du projet invalides (JSON malformé).'
          });
        }

        // Parser l'index des documents (métadonnées)
        let attachmentsIndex;
        try {
          attachmentsIndex = JSON.parse(authReq.body.attachmentsIndex || '[]');
        } catch (error) {
          attachmentsIndex = [];
        }

        console.log('📥 Réception soumission projet :');
        console.log('  - Utilisateur:', idUtilisateur);
        console.log('  - Titre:', projectData.title);
        console.log('  - Fichiers uploadés:', Object.keys(files).length);

        // Appeler le service pour créer la demande
        const demande = await demandeSubventionService.soumettre(
            projectData,
            files,
            attachmentsIndex,
            idUtilisateur
        );

        res.status(201).json({
          message: 'Projet soumis avec succès.',
          data: demande
        });
      } catch (error: any) {
        console.error('❌ Erreur soumission projet:', error);
        next(error);
      }
    }
);

// ========================================
// Routes CRUD classiques (inchangées)
// ========================================

/**
 * @route   POST /api/demandes
 * @desc    Créer une nouvelle demande de subvention (brouillon)
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