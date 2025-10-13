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

    // Vérifier si l'organisation existe déjà
    const existingOrg = await prisma.organisation.findFirst({
      where: {
        OR: [{ email }, ...(username ? [{ username }] : [])]
      }
    });

    if (existingOrg) {
      throw new AppError("Email ou nom d'utilisateur déjà utilisé.", 409);
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
      userName: orgData.name || orgData.username
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
        // ✅ L'utilisateur représente l'organisation
        // ÉTAPE 1: Créer d'abord l'utilisateur (User)
        // ÉTAPE 2: Puis créer l'organisation liée à cet utilisateur

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

          // ÉTAPE 2: Créer l'Organisation liée à ce User
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
              typeOrganisationId: registrationData.typeOrganisationId ?? null,
              otp: null,
              otpExpiry: null
            }
          });

          return { user, organisation };
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
          user: orgWithoutPassword,
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

    // Le username peut être un email ou un username
    // On cherche d'abord parmi les utilisateurs
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: username }, ...(username ? [{ username }] : [])]
      }
    });

    if (user) {
      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new AppError('Identifiants incorrects.', 401);
      }

      // Vérifier que le compte est vérifié (pas d'OTP en attente)
      if (user.otp !== null) {
        throw new AppError("Votre compte n'est pas encore vérifié. Veuillez vérifier votre email.", 403);
      }

      // Générer le token JWT
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
        type: 'user'
      };
    }

    // Chercher parmi les organisations
    const organisation = await prisma.organisation.findFirst({
      where: {
        OR: [{ email: username }, ...(username ? [{ username }] : [])]
      },
      include: {
        typeOrganisation: true
      }
    });

    if (organisation) {
      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, organisation.password);

      if (!isPasswordValid) {
        throw new AppError('Identifiants incorrects.', 401);
      }

      // Vérifier que le compte est vérifié
      if (organisation.otp !== null) {
        throw new AppError("Votre compte n'est pas encore vérifié. Veuillez vérifier votre email.", 403);
      }

      // Générer le token JWT
      const token = this.generateToken({
        userId: organisation.id,
        email: organisation.email,
        userType: 'organisation'
      });

      const { password: _, otp: __, otpExpiry: ___, ...orgWithoutSensitiveData } = organisation;

      return {
        message: 'Connexion réussie.',
        token,
        user: orgWithoutSensitiveData,
        type: 'organisation'
      };
    }

    throw new AppError('Identifiants incorrects.', 401);
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  async isAuthenticated(userId: string) {
    // Chercher d'abord parmi les utilisateurs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        userType: true
      }
    });

    if (user) {
      return { user, type: 'user' };
    }

    // Chercher parmi les organisations
    const organisation = await prisma.organisation.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        type: true
      }
    });

    if (organisation) {
      return { user: organisation, type: 'organisation' };
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
