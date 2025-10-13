import prisma from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';

export class AAPService {
  /**
   * Créer un nouvel appel à projets
   */
  async createAAP(data: any) {
    const { subventions, thematiques, ...aapData } = data;

    const aap = await prisma.appelAProjet.create({
      data: {
        ...aapData,
        launchDate: new Date(aapData.launchDate),
        subventions: {
          create: subventions?.map((subvention: any) => ({
            name: subvention.name,
            amountMin: subvention.amountMin,
            amountMax: subvention.amountMax,
            durationMaxMonths: subvention.durationMaxMonths,
            deadlineNoteConceptuelle: new Date(subvention.deadlineNoteConceptuelle),
            cycleSteps: {
              create: subvention.cycle?.map((step: any, index: number) => ({
                step: step.step,
                dates: step.dates,
                ordre: index + 1
              })) || []
            }
          })) || []
        },
        thematiques: {
          create: thematiques?.map((thematique: any) => ({
            title: thematique.title,
            bullets: thematique.bullets || [],
            typeSubvention: thematique.typeSubvention
          })) || []
        }
      },
      include: {
        subventions: {
          include: {
            cycleSteps: {
              orderBy: {
                ordre: 'asc'
              }
            }
          }
        },
        thematiques: true
      }
    });

    return aap;
  }

  /**
   * Récupérer tous les appels à projets actifs
   */
  async getAllAAPs(includeInactive: boolean = false) {
    const aaps = await prisma.appelAProjet.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        subventions: {
          include: {
            cycleSteps: {
              orderBy: {
                ordre: 'asc'
              }
            }
          }
        },
        thematiques: true
      },
      orderBy: {
        launchDate: 'desc'
      }
    });

    return aaps;
  }

  /**
   * Récupérer un appel à projets par ID
   */
  async getAAPById(id: string) {
    const aap = await prisma.appelAProjet.findUnique({
      where: { id },
      include: {
        subventions: {
          include: {
            cycleSteps: {
              orderBy: {
                ordre: 'asc'
              }
            }
          }
        },
        thematiques: true
      }
    });

    if (!aap) {
      throw new AppError('Appel à projets non trouvé.', 404);
    }

    return aap;
  }

  /**
   * Récupérer un appel à projets par code
   */
  async getAAPByCode(code: string) {
    const aap = await prisma.appelAProjet.findUnique({
      where: { code },
      include: {
        subventions: {
          include: {
            cycleSteps: {
              orderBy: {
                ordre: 'asc'
              }
            }
          }
        },
        thematiques: true
      }
    });

    if (!aap) {
      throw new AppError('Appel à projets non trouvé.', 404);
    }

    return aap;
  }

  /**
   * Mettre à jour un appel à projets
   */
  async updateAAP(id: string, data: any) {
    const existingAAP = await prisma.appelAProjet.findUnique({
      where: { id }
    });

    if (!existingAAP) {
      throw new AppError('Appel à projets non trouvé.', 404);
    }

    const { subventions, thematiques, ...aapData } = data;

    // Mettre à jour l'AAP
    const updatedAAP = await prisma.appelAProjet.update({
      where: { id },
      data: {
        ...aapData,
        ...(aapData.launchDate && { launchDate: new Date(aapData.launchDate) })
      },
      include: {
        subventions: {
          include: {
            cycleSteps: {
              orderBy: {
                ordre: 'asc'
              }
            }
          }
        },
        thematiques: true
      }
    });

    return updatedAAP;
  }

  /**
   * Activer/Désactiver un appel à projets
   */
  async toggleAAPStatus(id: string) {
    const aap = await prisma.appelAProjet.findUnique({
      where: { id }
    });

    if (!aap) {
      throw new AppError('Appel à projets non trouvé.', 404);
    }

    const updatedAAP = await prisma.appelAProjet.update({
      where: { id },
      data: {
        isActive: !aap.isActive
      }
    });

    return updatedAAP;
  }

  /**
   * Supprimer un appel à projets
   */
  async deleteAAP(id: string) {
    const aap = await prisma.appelAProjet.findUnique({
      where: { id }
    });

    if (!aap) {
      throw new AppError('Appel à projets non trouvé.', 404);
    }

    // Supprimer l'AAP (cascade delete pour subventions et thématiques)
    await prisma.appelAProjet.delete({
      where: { id }
    });

    return { message: 'Appel à projets supprimé avec succès.' };
  }

  /**
   * Récupérer les types d'organisations
   */
  async getAllTypeOrganisations() {
    const types = await prisma.typeOrganisation.findMany({
      orderBy: {
        nom: 'asc'
      }
    });

    return types;
  }

  /**
   * Créer un type d'organisation
   */
  async createTypeOrganisation(nom: string) {
    const type = await prisma.typeOrganisation.create({
      data: { nom }
    });

    return type;
  }
}
