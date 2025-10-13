import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { FpbgUsersDTO, JwtPayload, LoginVM, OrganisationDTO } from '../types/index.js';
import { generateOtp } from '../utils/generateOtp.js';
import { sendOTPEmail } from '../utils/sendEmailWithBrevo.js';

// Stockage temporaire des inscriptions en attente (en production, utilisez Redis)
const pendingRegistrations: {
  [email: string]: {
    registrationData: any;
    otp: string;
    otpExpiry: Date;
    type: 'user' | 'organisation';
  };
} = {};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET n'est pas défini dans les variables d'environnement");
  }
  return secret;
};

export class AuthService {
  /**
   * INSCRIPTION - Étape 1 : Enregistrer un agent FPBG et envoyer l'OTP
   */
  async registerAgentFpbg(userData: FpbgUsersDTO) {
    const { email, username, password } = userData;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(username ? [{ username }] : [])]
      }
    });

    if (existingUser) {
      throw new AppError("Email ou nom d'utilisateur déjà utilisé.", 409);
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Générer OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Stocker temporairement
    pendingRegistrations[email] = {
      registrationData: { ...userData, password: hashedPassword },
      otp,
      otpExpiry,
      type: 'user'
    };

    // Retourner l'OTP pour que le frontend l'envoie via EmailJS
    console.log(`✅ OTP généré pour ${email}: ${otp}`);

    return {
      message: 'Un code de vérification sera envoyé à votre adresse email.',
      email,
      otp, // Le frontend utilisera ceci pour envoyer l'email
      userName: userData.firstName || userData.username
    };
  }

  /**
   * INSCRIPTION - Étape 1 : Enregistrer une organisation et envoyer l'OTP
   */
  async registerOrganisation(orgData: OrganisationDTO) {
    const { email, username, password } = orgData;

    // Vérifier si l'email existe déjà (User ou Organisation)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    const existingOrg = await prisma.organisation.findUnique({ where: { email } });

    if (existingUser || existingOrg) {
      throw new AppError('Cet email est déjà utilisé.', 409);
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Générer OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Stocker temporairement
    pendingRegistrations[email] = {
      registrationData: { ...orgData, password: hashedPassword },
      otp,
      otpExpiry,
      type: 'organisation'
    };

    // Retourner l'OTP pour que le frontend l'envoie via EmailJS
    console.log(`✅ OTP généré pour ${email}: ${otp}`);

    return {
      message: 'Un code de vérification sera envoyé à votre adresse email.',
      email,
      otp, // Le frontend utilisera ceci pour envoyer l'email
      userName: orgData.name || orgData.contact || 'Utilisateur'
    };
  }

  /**
   * INSCRIPTION - Étape 2 : Vérifier l'OTP et créer le compte
   */
  async verifyOtp(email: string, otp: string) {
    const pending = pendingRegistrations[email];

    if (!pending) {
      throw new AppError('Aucune inscription en attente pour cet email.', 400);
    }

    if (pending.otp !== otp) {
      throw new AppError('Code OTP invalide.', 400);
    }

    if (pending.otpExpiry < new Date()) {
      delete pendingRegistrations[email];
      throw new AppError("Code OTP expiré. Veuillez recommencer l'inscription.", 400);
    }

    const { registrationData, type } = pending;

    try {
      if (type === 'user') {
        // Créer l'utilisateur
        const user = await prisma.user.create({
          data: {
            email: registrationData.email,
            username: registrationData.username,
            password: registrationData.password,
            firstName: registrationData.firstName ?? null,
            lastName: registrationData.lastName ?? null,
            numTel: registrationData.numTel ?? null,
            postalAddress: registrationData.postalAddress ?? null,
            physicalAddress: registrationData.physicalAddress ?? null,
            userType: registrationData.userType || 'agent',
            otp: null,
            otpExpiry: null
          }
        });

        delete pendingRegistrations[email];

        // Générer le token JWT
        const token = this.generateToken({
          userId: user.id,
          email: user.email,
          userType: user.userType || 'agent'
        });

        const { password: _, ...userWithoutPassword } = user;

        return {
          message: 'Compte vérifié avec succès !',
          token,
          user: userWithoutPassword,
          type: 'user'
        };
      } else {
        // ✅ ORGANISATION : Créer User → Organisation → TypeOrganisation
        // ÉTAPE 1: Créer le User
        // ÉTAPE 2: Trouver ou créer le TypeOrganisation
        // ÉTAPE 3: Créer l'Organisation liée

        const result = await prisma.$transaction(async (tx) => {
          // ÉTAPE 1: Créer le User en premier
          const user = await tx.user.create({
            data: {
              email: registrationData.email,
              username: registrationData.username ?? null,
              password: registrationData.password,
              firstName: registrationData.contact ?? null, // Contact = prénom+nom
              lastName: null,
              numTel: registrationData.numTel ?? null,
              postalAddress: registrationData.postalAddress ?? null,
              physicalAddress: registrationData.physicalAddress ?? null,
              userType: 'organisation',
              otp: null,
              otpExpiry: null
            }
          });

          // ÉTAPE 2: Trouver ou créer le TypeOrganisation
          let typeOrganisation = null;
          if (registrationData.type) {
            // Chercher si le type existe déjà
            typeOrganisation = await tx.typeOrganisation.findUnique({
              where: { nom: registrationData.type }
            });

            // Si le type n'existe pas, le créer automatiquement
            if (!typeOrganisation) {
              typeOrganisation = await tx.typeOrganisation.create({
                data: { nom: registrationData.type }
              });
              console.log(`✅ TypeOrganisation créé: ${typeOrganisation.nom}`);
            }
          }

          // ÉTAPE 3: Créer l'Organisation liée
          const organisation = await tx.organisation.create({
            data: {
              userId: user.id, // 🔗 Lien vers le User créé
              email: registrationData.email,
              password: registrationData.password,
              name: registrationData.name ?? null,
              username: registrationData.username ?? null,
              contact: registrationData.contact ?? null,
              numTel: registrationData.numTel ?? null,
              postalAddress: registrationData.postalAddress ?? null,
              physicalAddress: registrationData.physicalAddress ?? null,
              type: registrationData.type ?? null,
              grantType: registrationData.grantType ?? null,
              usernamePersonneContacter: registrationData.usernamePersonneContacter ?? null,
              typeOrganisationId: typeOrganisation?.id ?? null, // 🔗 Lien vers TypeOrganisation
              otp: null,
              otpExpiry: null
            }
          });

          return { user, organisation, typeOrganisation };
        });

        delete pendingRegistrations[email];

        // Générer le token JWT avec l'ID du User (pas de l'organisation)
        const token = this.generateToken({
          userId: result.user.id,
          email: result.user.email,
          userType: 'organisation'
        });

        const { password: _, ...orgWithoutPassword } = result.organisation;

        return {
          message: 'Compte vérifié avec succès !',
          token,
          user: {
            ...orgWithoutPassword,
            typeOrganisation: result.typeOrganisation
          },
          type: 'organisation'
        };
      }
    } catch (error: any) {
      delete pendingRegistrations[email];
      throw new AppError('Erreur lors de la création du compte: ' + error.message, 500);
    }
  }

  /**
   * CONNEXION - Authentification avec email + mot de passe uniquement
   */
  async login(loginData: LoginVM) {
    const { username, password } = loginData;

    // Le username est maintenant toujours un EMAIL
    // On cherche d'abord parmi les utilisateurs (par email uniquement)
    const user = await prisma.user.findUnique({
      where: { email: username },
      include: {
        organisation: {
          include: {
            typeOrganisation: true
          }
        }
      }
    });

    if (user) {
      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new AppError('Email ou mot de passe incorrect.', 401);
      }

      // Vérifier que le compte est vérifié (pas d'OTP en attente)
      if (user.otp !== null) {
        throw new AppError("Votre compte n'est pas encore vérifié. Veuillez vérifier votre email.", 403);
      }

      // Générer le token JWT avec l'ID du USER
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        userType: user.userType || 'agent'
      });

      const { password: _, otp: __, otpExpiry: ___, ...userWithoutSensitiveData } = user;

      return {
        message: 'Connexion réussie.',
        token,
        user: userWithoutSensitiveData,
        type: user.userType || 'user'
      };
    }

    throw new AppError('Email ou mot de passe incorrect.', 401);
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  async isAuthenticated(userId: string) {
    // Chercher l'utilisateur avec son organisation et typeOrganisation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organisation: {
          include: {
            typeOrganisation: true
          }
        }
      }
    });

    if (user) {
      const { password: _, otp: __, otpExpiry: ___, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        type: user.userType || 'user'
      };
    }

    throw new AppError('Utilisateur non trouvé.', 404);
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken(userId: string) {
    const { user, type } = await this.isAuthenticated(userId);

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      userType: type === 'user' ? (user as any).userType : 'organisation'
    });

    return { token, user, type };
  }

  /**
   * Générer un token JWT
   */
  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
  }

  /**
   * Renvoyer un nouveau code OTP
   */
  async resendOtp(email: string) {
    const pending = pendingRegistrations[email];

    if (!pending) {
      throw new AppError('Aucune inscription en attente pour cet email.', 400);
    }

    // Générer un nouveau OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    pending.otp = otp;
    pending.otpExpiry = otpExpiry;

    // Envoyer le nouvel OTP
    try {
      const name =
        pending.registrationData.firstName || pending.registrationData.name || pending.registrationData.username;
      await sendOTPEmail(email, otp, name);
    } catch (error) {
      throw new AppError("Erreur lors de l'envoi de l'email de vérification.", 500);
    }

    return {
      message: 'Un nouveau code de vérification a été envoyé à votre adresse email.',
      email
    };
  }
}
