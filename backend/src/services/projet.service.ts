import prisma from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ProjetFormDTO } from '../types/index.js';

export class ProjetService {
  /**
   * Créer un nouveau projet
   */
  async createProjet(projetData: Partial<ProjetFormDTO>, files: any, userId: string) {
    // Récupérer l'organisation liée à l'utilisateur
    const organisation = await prisma.organisation.findUnique({
      where: { id: userId }
    });

    if (!organisation) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    // Préparer les chemins de fichiers
    const filesData: any = {};
    if (files) {
      if (files.cv) filesData.cv = Array.isArray(files.cv) ? files.cv.map((f: any) => f.path) : [files.cv.path];
      if (files.ficheC) filesData.ficheC = files.ficheC[0]?.path;
      if (files.lM) filesData.lM = files.lM[0]?.path;
      if (files.stR) filesData.stR = files.stR[0]?.path;
      if (files.rib) filesData.rib = files.rib[0]?.path;
      if (files.cA) filesData.cA = files.cA[0]?.path;
      if (files.budgetD) filesData.budgetD = files.budgetD[0]?.path;
      if (files.che) filesData.che = files.che[0]?.path;
      if (files.cartography) filesData.cartography = files.cartography[0]?.path;
      if (files.lP) filesData.lP = files.lP[0]?.path;
    }

    // Créer le projet
    const projet = await prisma.projet.create({
      data: {
        organisationId: organisation.id,
        title: projetData.title,
        actPrin: projetData.actPrin,
        dateLimPro: projetData.dateLimPro ? new Date(projetData.dateLimPro) : null,
        rAtt: projetData.rAtt,
        objP: projetData.objP,
        conjP: projetData.conjP,
        lexGcp: projetData.lexGcp,
        poRistEnvSoPo: projetData.poRistEnvSoPo,
        dPRep: projetData.dPRep,
        conseilPr: projetData.conseilPr,
        stade: projetData.stade || 'BROUILLON',
        funding: projetData.funding,
        ...filesData
      },
      include: {
        organisation: {
          include: {
            typeOrganisation: true
          }
        }
      }
    });

    return projet;
  }

  /**
   * Récupérer tous les projets avec pagination
   */
  async getAllProjets(page: number = 0, size: number = 10, eagerload: boolean = true) {
    const skip = page * size;

    const [projets, total] = await Promise.all([
      prisma.projet.findMany({
        skip,
        take: size,
        ...(eagerload && {
          include: {
            organisation: {
              include: {
                typeOrganisation: true
              }
            }
          }
        }),
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.projet.count()
    ]);

    return {
      projets,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size)
    };
  }

  /**
   * Récupérer tous les projets sans pagination
   */
  async getAllProjetsNoPage() {
    const projets = await prisma.projet.findMany({
      include: {
        organisation: {
          include: {
            typeOrganisation: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return projets;
  }

  /**
   * Récupérer un projet par ID
   */
  async getProjetById(id: string) {
    const projet = await prisma.projet.findUnique({
      where: { id },
      include: {
        organisation: {
          include: {
            typeOrganisation: true
          }
        }
      }
    });

    if (!projet) {
      throw new AppError('Projet non trouvé.', 404);
    }

    return projet;
  }

  /**
   * Récupérer le projet de l'utilisateur connecté
   */
  async getProjetByUser(userId: string) {
    // Vérifier si l'utilisateur est une organisation
    const organisation = await prisma.organisation.findUnique({
      where: { id: userId }
    });

    if (!organisation) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    // Récupérer le dernier projet de cette organisation
    const projet = await prisma.projet.findFirst({
      where: { organisationId: organisation.id },
      include: {
        organisation: {
          include: {
            typeOrganisation: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!projet) {
      throw new AppError('Aucun projet trouvé pour cette organisation.', 404);
    }

    return projet;
  }

  /**
   * Mettre à jour un projet (PUT)
   */
  async updateProjet(id: string, projetData: Partial<ProjetFormDTO>, userId: string) {
    // Vérifier que le projet existe
    const existingProjet = await prisma.projet.findUnique({
      where: { id }
    });

    if (!existingProjet) {
      throw new AppError('Projet non trouvé.', 404);
    }

    // Vérifier que l'utilisateur est propriétaire du projet
    if (existingProjet.organisationId !== userId) {
      throw new AppError("Vous n'avez pas l'autorisation de modifier ce projet.", 403);
    }

    // Mettre à jour le projet
    const updatedProjet = await prisma.projet.update({
      where: { id },
      data: {
        title: projetData.title!,
        actPrin: projetData.actPrin!,
        dateLimPro: projetData.dateLimPro ? new Date(projetData.dateLimPro) : null,
        rAtt: projetData.rAtt!,
        objP: projetData.objP!,
        conjP: projetData.conjP!,
        lexGcp: projetData.lexGcp!,
        poRistEnvSoPo: projetData.poRistEnvSoPo!,
        dPRep: projetData.dPRep!,
        conseilPr: projetData.conseilPr!,
        stade: projetData.stade!,
        funding: projetData.funding!
      },
      include: {
        organisation: {
          include: {
            typeOrganisation: true
          }
        }
      }
    });

    return updatedProjet;
  }

  /**
   * Mise à jour partielle (PATCH)
   */
  async partialUpdateProjet(id: string, projetData: Partial<ProjetFormDTO>, userId: string) {
    // Vérifier que le projet existe
    const existingProjet = await prisma.projet.findUnique({
      where: { id }
    });

    if (!existingProjet) {
      throw new AppError('Projet non trouvé.', 404);
    }

    // Vérifier que l'utilisateur est propriétaire du projet
    if (existingProjet.organisationId !== userId) {
      throw new AppError("Vous n'avez pas l'autorisation de modifier ce projet.", 403);
    }

    // Préparer les données à mettre à jour
    const updateData: any = {};
    Object.keys(projetData).forEach((key) => {
      if (projetData[key as keyof ProjetFormDTO] !== undefined) {
        updateData[key] = projetData[key as keyof ProjetFormDTO];
      }
    });

    if (updateData.dateLimPro) {
      updateData.dateLimPro = new Date(updateData.dateLimPro);
    }

    // Mettre à jour le projet
    const updatedProjet = await prisma.projet.update({
      where: { id },
      data: updateData,
      include: {
        organisation: {
          include: {
            typeOrganisation: true
          }
        }
      }
    });

    return updatedProjet;
  }

  /**
   * Supprimer un projet
   */
  async deleteProjet(id: string, userId: string, isAdmin: boolean = false) {
    // Vérifier que le projet existe
    const existingProjet = await prisma.projet.findUnique({
      where: { id }
    });

    if (!existingProjet) {
      throw new AppError('Projet non trouvé.', 404);
    }

    // Vérifier les permissions
    if (!isAdmin && existingProjet.organisationId !== userId) {
      throw new AppError("Vous n'avez pas l'autorisation de supprimer ce projet.", 403);
    }

    // Supprimer le projet
    await prisma.projet.delete({
      where: { id }
    });

    return { message: 'Projet supprimé avec succès.' };
  }
}
