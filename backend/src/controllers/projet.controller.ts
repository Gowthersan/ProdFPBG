import { Request, Response, NextFunction } from 'express';
import { ProjetService } from '../services/projet.service.js';
import { ProjetFormDTO } from '../types/index.js';

const projetService = new ProjetService();

export class ProjetController {
  /**
   * POST /api/aprojet-v1/createProjet
   * Créer un nouveau projet
   */
  static async createProjet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise.' });
      }

      const projetData: Partial<ProjetFormDTO> = req.body;
      const files = (req as any).files; // multer files

      const projet = await projetService.createProjet(projetData, files, req.user.userId);

      res.status(201).json({
        message: 'Projet créé avec succès.',
        projet
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/aprojet-v1
   * Récupérer tous les projets avec pagination
   */
  static async getAllProjets(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const size = parseInt(req.query.size as string) || 10;
      const eagerload = req.query.eagerload === 'true';

      const result = await projetService.getAllProjets(page, size, eagerload);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/aprojet-v1/all
   * Récupérer tous les projets sans pagination
   */
  static async getAllProjetsNoPage(req: Request, res: Response, next: NextFunction) {
    try {
      const projets = await projetService.getAllProjetsNoPage();

      res.json(projets);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/aprojet-v1/:id
   * Récupérer un projet par ID
   */
  static async getProjetById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const projet = await projetService.getProjetById(id);

      res.json(projet);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/aprojet-v1/user
   * Récupérer le projet de l'utilisateur connecté
   */
  static async getProjetByUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise.' });
      }

      const projet = await projetService.getProjetByUser(req.user.userId);

      res.json(projet);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/aprojet-v1/:id
   * Mettre à jour un projet
   */
  static async updateProjet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise.' });
      }

      const { id } = req.params;
      const projetData: Partial<ProjetFormDTO> = req.body;

      const projet = await projetService.updateProjet(id, projetData, req.user.userId);

      res.json({
        message: 'Projet mis à jour avec succès.',
        projet
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/aprojet-v1/:id
   * Mise à jour partielle d'un projet
   */
  static async partialUpdateProjet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise.' });
      }

      const { id } = req.params;
      const projetData: Partial<ProjetFormDTO> = req.body;

      const projet = await projetService.partialUpdateProjet(id, projetData, req.user.userId);

      res.json({
        message: 'Projet mis à jour avec succès.',
        projet
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/aprojet-v1/:id
   * Supprimer un projet
   */
  static async deleteProjet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise.' });
      }

      const { id } = req.params;
      const isAdmin = req.user.userType === 'admin' || req.user.userType === 'agent';

      const result = await projetService.deleteProjet(id, req.user.userId, isAdmin);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
