import prisma from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { DemandeSubventionDTO } from '../types/index.js';

/**
 * Service pour gérer les demandes de subvention
 * Utilise le nouveau schema Prisma avec noms en français
 */
export class DemandeSubventionService {
  /**
   * Créer une nouvelle demande de subvention
   */
  async creer(data: DemandeSubventionDTO, idUtilisateur: string) {
    try {
      // Vérifier que l'utilisateur existe
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { id: idUtilisateur },
        include: { organisation: true }
      });

      if (!utilisateur) {
        throw new AppError('Utilisateur non trouvé.', 404);
      }

      // Créer la demande de subvention
      const demande = await prisma.demandeSubvention.create({
        data: {
          // Métadonnées
          statut: (data.statut as any) || 'BROUILLON',
          typeSoumission: (data.typeSoumission as any) || 'NOTE_CONCEPTUELLE',

          // Relations
          idSoumisPar: idUtilisateur,
          idOrganisation: utilisateur.idOrganisation ?? data.idOrganisation ?? null,
          idAppelProjets: data.idAppelProjets ?? null,

          // Étape 1 — Proposition
          titre: data.titre ?? '',
          localisation: data.localisation!,
          groupeCible: data.groupeCible!,
          justificationContexte: data.justificationContexte!,

          // Étape 2 — Objectifs & résultats
          objectifs: data.objectifs!,
          resultatsAttendus: data.resultatsAttendus!,
          dureeMois: data.dureeMois!,

          // Étape 3 — Activités
          dateDebutActivites: new Date(data.dateDebutActivites!),
          dateFinActivites: new Date(data.dateFinActivites!),
          resumeActivites: data.resumeActivites!,

          // Budget
          tauxUsd: data.tauxUsd ?? 600,
          fraisIndirectsCfa: data.fraisIndirectsCfa ?? 0,
          terrainCfa: data.terrainCfa ?? null,
          investCfa: data.investCfa ?? null,
          overheadCfa: data.overheadCfa ?? null,
          cofinCfa: data.cofinCfa ?? null,

          // Autres
          stadeProjet: (data.stadeProjet as any) || 'DEMARRAGE',
          aFinancement: data.aFinancement ?? false,
          detailsFinancement: data.detailsFinancement ?? null,
          honneurAccepte: data.honneurAccepte ?? false,
          texteDurabilite: data.texteDurabilite!,
          texteReplication: data.texteReplication ?? null
        },
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          },
          appelProjets: {
            include: {
              typeSubvention: true
            }
          }
        }
      });

      return demande;
    } catch (error: any) {
      console.error('Erreur création demande:', error);
      throw new AppError('Erreur lors de la création de la demande: ' + error.message, 500);
    }
  }

  /**
   * Récupérer toutes les demandes de subvention (admin)
   */
  async obtenirTout(filtres?: {
    statut?: string;
    typeSoumission?: string;
    idOrganisation?: string;
    idAppelProjets?: string;
  }) {
    try {
      const where: any = {};

      if (filtres?.statut) {
        where.statut = filtres.statut;
      }
      if (filtres?.typeSoumission) {
        where.typeSoumission = filtres.typeSoumission;
      }
      if (filtres?.idOrganisation) {
        where.idOrganisation = filtres.idOrganisation;
      }
      if (filtres?.idAppelProjets) {
        where.idAppelProjets = filtres.idAppelProjets;
      }

      const demandes = await prisma.demandeSubvention.findMany({
        where,
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          },
          appelProjets: {
            include: {
              typeSubvention: true
            }
          }
        },
        orderBy: {
          creeLe: 'desc'
        }
      });

      return demandes;
    } catch (error: any) {
      console.error('Erreur récupération demandes:', error);
      throw new AppError('Erreur lors de la récupération des demandes: ' + error.message, 500);
    }
  }

  /**
   * Récupérer les demandes d'un utilisateur
   */
  async obtenirParUtilisateur(idUtilisateur: string) {
    try {
      const demandes = await prisma.demandeSubvention.findMany({
        where: { idSoumisPar: idUtilisateur },
        include: {
          organisation: true,
          appelProjets: {
            include: {
              typeSubvention: true
            }
          },
          activites: {
            include: {
              sousActivites: true,
              lignesBudget: true
            }
          },
          risques: true,
          piecesJointes: true
        },
        orderBy: {
          creeLe: 'desc'
        }
      });

      return demandes;
    } catch (error: any) {
      console.error('Erreur récupération demandes utilisateur:', error);
      throw new AppError('Erreur lors de la récupération des demandes: ' + error.message, 500);
    }
  }

  /**
   * Récupérer une demande par ID
   */
  async obtenirParId(id: string, idUtilisateur?: string) {
    try {
      const demande = await prisma.demandeSubvention.findUnique({
        where: { id },
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          },
          appelProjets: {
            include: {
              typeSubvention: true,
              thematiques: true
            }
          },
          activites: {
            include: {
              sousActivites: true,
              lignesBudget: true
            },
            orderBy: { ordre: 'asc' }
          },
          risques: {
            orderBy: { ordre: 'asc' }
          },
          piecesJointes: true,
          evaluations: {
            include: {
              evaluateur: {
                select: {
                  id: true,
                  email: true,
                  prenom: true,
                  nom: true
                }
              }
            }
          },
          contrat: true,
          rapports: {
            orderBy: { dateEcheance: 'asc' }
          },
          cofinanceurs: true
        }
      });

      if (!demande) {
        throw new AppError('Demande non trouvée.', 404);
      }

      // Vérifier que l'utilisateur a accès à cette demande
      if (idUtilisateur && demande.idSoumisPar !== idUtilisateur) {
        // Vérifier si l'utilisateur est admin
        const utilisateur = await prisma.utilisateur.findUnique({
          where: { id: idUtilisateur }
        });

        if (!utilisateur || utilisateur.role !== 'ADMINISTRATEUR') {
          throw new AppError('Accès non autorisé à cette demande.', 403);
        }
      }

      return demande;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Erreur récupération demande:', error);
      throw new AppError('Erreur lors de la récupération de la demande: ' + error.message, 500);
    }
  }

  /**
   * Mettre à jour une demande de subvention
   */
  async mettreAJour(id: string, data: DemandeSubventionDTO, idUtilisateur: string) {
    try {
      // Vérifier que la demande existe et appartient à l'utilisateur
      const demandeExistante = await prisma.demandeSubvention.findUnique({
        where: { id }
      });

      if (!demandeExistante) {
        throw new AppError('Demande non trouvée.', 404);
      }

      if (demandeExistante.idSoumisPar !== idUtilisateur) {
        throw new AppError("Vous n'êtes pas autorisé à modifier cette demande.", 403);
      }

      // Mettre à jour la demande
      const updateData: any = {};

      if (data.titre) updateData.titre = data.titre;
      if (data.localisation) updateData.localisation = data.localisation;
      if (data.groupeCible) updateData.groupeCible = data.groupeCible;
      if (data.justificationContexte) updateData.justificationContexte = data.justificationContexte;
      if (data.objectifs) updateData.objectifs = data.objectifs;
      if (data.resultatsAttendus) updateData.resultatsAttendus = data.resultatsAttendus;
      if (data.dureeMois) updateData.dureeMois = data.dureeMois;
      if (data.dateDebutActivites) updateData.dateDebutActivites = new Date(data.dateDebutActivites);
      if (data.dateFinActivites) updateData.dateFinActivites = new Date(data.dateFinActivites);
      if (data.resumeActivites) updateData.resumeActivites = data.resumeActivites;
      if (data.texteDurabilite) updateData.texteDurabilite = data.texteDurabilite;
      if (data.texteReplication) updateData.texteReplication = data.texteReplication;
      if (data.statut) updateData.statut = data.statut;
      if (data.stadeProjet) updateData.stadeProjet = data.stadeProjet;
      if (data.aFinancement !== undefined) updateData.aFinancement = data.aFinancement;
      if (data.detailsFinancement) updateData.detailsFinancement = data.detailsFinancement;
      if (data.honneurAccepte !== undefined) updateData.honneurAccepte = data.honneurAccepte;

      const demande = await prisma.demandeSubvention.update({
        where: { id },
        data: updateData,
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          },
          appelProjets: {
            include: {
              typeSubvention: true
            }
          }
        }
      });

      return demande;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Erreur mise à jour demande:', error);
      throw new AppError('Erreur lors de la mise à jour de la demande: ' + error.message, 500);
    }
  }

  /**
   * Supprimer une demande de subvention
   */
  async supprimer(id: string, idUtilisateur: string) {
    try {
      // Vérifier que la demande existe et appartient à l'utilisateur
      const demande = await prisma.demandeSubvention.findUnique({
        where: { id }
      });

      if (!demande) {
        throw new AppError('Demande non trouvée.', 404);
      }

      if (demande.idSoumisPar !== idUtilisateur) {
        throw new AppError("Vous n'êtes pas autorisé à supprimer cette demande.", 403);
      }

      // Supprimer la demande (cascade delete sur les relations)
      await prisma.demandeSubvention.delete({
        where: { id }
      });

      return { message: 'Demande supprimée avec succès.' };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Erreur suppression demande:', error);
      throw new AppError('Erreur lors de la suppression de la demande: ' + error.message, 500);
    }
  }

  /**
   * Obtenir les statistiques pour le dashboard admin
   */
  async obtenirStatistiques() {
    try {
      const total = await prisma.demandeSubvention.count();

      const parStatut = await prisma.demandeSubvention.groupBy({
        by: ['statut'],
        _count: true
      });

      const parTypeSoumission = await prisma.demandeSubvention.groupBy({
        by: ['typeSoumission'],
        _count: true
      });

      const demandesRecentes = await prisma.demandeSubvention.findMany({
        take: 5,
        orderBy: {
          creeLe: 'desc'
        },
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          }
        }
      });

      return {
        total,
        parStatut: parStatut.map((s) => ({
          statut: s.statut,
          nombre: s._count
        })),
        parTypeSoumission: parTypeSoumission.map((t) => ({
          type: t.typeSoumission,
          nombre: t._count
        })),
        demandesRecentes
      };
    } catch (error: any) {
      console.error('Erreur statistiques:', error);
      throw new AppError('Erreur lors de la récupération des statistiques: ' + error.message, 500);
    }
  }

  /**
   * Changer le statut d'une demande (admin uniquement)
   */
  async changerStatut(id: string, nouveauStatut: string, idAdmin: string) {
    try {
      // Vérifier que l'utilisateur est admin
      const admin = await prisma.utilisateur.findUnique({
        where: { id: idAdmin }
      });

      if (!admin || admin.role !== 'ADMINISTRATEUR') {
        throw new AppError('Accès non autorisé. Vous devez être administrateur.', 403);
      }

      // Mettre à jour le statut
      const demande = await prisma.demandeSubvention.update({
        where: { id },
        data: { statut: nouveauStatut as any },
        include: {
          organisation: true,
          soumisPar: {
            select: {
              id: true,
              email: true,
              prenom: true,
              nom: true
            }
          }
        }
      });

      // Logger l'action dans le journal d'audit
      await prisma.journalAudit.create({
        data: {
          entite: 'DemandeSubvention',
          idEntite: id,
          action: 'changement_statut',
          idUtilisateur: idAdmin,
          details: {
            ancienStatut: nouveauStatut,
            nouveauStatut: nouveauStatut
          }
        }
      });

      return demande;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Erreur changement statut:', error);
      throw new AppError('Erreur lors du changement de statut: ' + error.message, 500);
    }
  }
}

export default new DemandeSubventionService();
