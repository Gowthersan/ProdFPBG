import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import aapRoutes from './routes/aap.routes.js';
import authRoutes from './routes/auth.routes.js';
import demandeSubventionRoutes from './routes/demandeSubvention.routes.js';
import organisationRoutes from './routes/organisation.routes.js';
import projetRoutes from './routes/projet.routes.js';
import { verifyEmailConfig } from './utils/mailer.js';

// Charger les variables d'environnement
dotenv.config();

const app = express();

// Configuration pour __dirname en mode ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration CORS - Permissive pour le développement
app.use(
  cors({
    origin: function (origin, callback) {
      // Autoriser toutes les origines localhost en développement
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('https://api.fpbg.singcloud.ga')) {
        callback(null, true);
      } else if (process.env.FRONT_URL && origin === process.env.FRONT_URL) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true // Permet l'envoi de cookies
  })
);

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Servir les fichiers statiques (uploads)
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));
console.log('📁 Fichiers statiques servis depuis:', uploadsPath);

// Route de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'FPBG Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes de l'API
app.use('/api/auth', authRoutes);
app.use('/api/aprojet-v1', projetRoutes);
app.use('/api/organisations', organisationRoutes);
app.use('/api/aap', aapRoutes);
app.use('/api/demandes', demandeSubventionRoutes); // ✅ Nouvelles routes pour demandes de subvention

// Middleware pour les routes non trouvées
app.use(notFoundHandler);

// Middleware de gestion des erreurs (doit être en dernier)
app.use(errorHandler);

// Démarrage du serveur
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`✅ Serveur FPBG lancé sur le port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);

  // Vérifier la configuration email au démarrage
  console.log('\n📧 Vérification de la configuration email...');
  await verifyEmailConfig();
  console.log('');
});

export default app;
