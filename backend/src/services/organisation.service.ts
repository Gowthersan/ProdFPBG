import prisma from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';

export class OrganisationService {
  /**
   * Récupérer l'organisation connectée
   */
  async getOrganismeConnected(userId: string) {
    const organisation = await prisma.organisation.findUnique({
      where: { id: userId },
      include: {
        typeOrganisation: true,
        projets: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!organisation) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    // Retourner sans le mot de passe
    const { password, otp, otpExpiry, ...organisationData } = organisation;

    return organisationData;
  }

  /**
   * Récupérer toutes les organisations (admin only)
   */
  async getAllOrganisations() {
    const organisations = await prisma.organisation.findMany({
      include: {
        typeOrganisation: true,
        _count: {
          select: { projets: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Retourner sans les mots de passe
    return organisations.map(org => {
      const { password, otp, otpExpiry, ...orgData } = org;
      return orgData;
    });
  }

  /**
   * Récupérer une organisation par ID (admin only)
   */
  async getOrganisationById(id: string) {
    const organisation = await prisma.organisation.findUnique({
      where: { id },
      include: {
        typeOrganisation: true,
        projets: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!organisation) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    const { password, otp, otpExpiry, ...organisationData } = organisation;

    return organisationData;
  }

  /**
   * Mettre à jour une organisation
   */
  async updateOrganisation(id: string, data: any, userId: string, isAdmin: boolean = false) {
    // Vérifier les permissions
    if (!isAdmin && id !== userId) {
      throw new AppError('Vous n\'avez pas l\'autorisation de modifier cette organisation.', 403);
    }

    // Vérifier que l'organisation existe
    const existingOrg = await prisma.organisation.findUnique({
      where: { id }
    });

    if (!existingOrg) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    // Supprimer les champs sensibles des données
    const { password, otp, otpExpiry, ...updateData } = data;

    // Mettre à jour l'organisation
    const updatedOrg = await prisma.organisation.update({
      where: { id },
      data: updateData,
      include: {
        typeOrganisation: true
      }
    });

    const { password: _, otp: __, otpExpiry: ___, ...orgData } = updatedOrg;

    return orgData;
  }

  /**
   * Supprimer une organisation (admin only)
   */
  async deleteOrganisation(id: string) {
    const organisation = await prisma.organisation.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projets: true }
        }
      }
    });

    if (!organisation) {
      throw new AppError('Organisation non trouvée.', 404);
    }

    if (organisation._count.projets > 0) {
      throw new AppError('Impossible de supprimer une organisation avec des projets existants.', 400);
    }

    await prisma.organisation.delete({
      where: { id }
    });

    return { message: 'Organisation supprimée avec succès.' };
  }
}
