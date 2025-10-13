import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import projetRoutes from './routes/projet.routes.js';
import organisationRoutes from './routes/organisation.routes.js';
import aapRoutes from './routes/aap.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

// Charger les variables d'environnement
dotenv.config();

const app = express();

// Configuration CORS - Permissive pour le développement
app.use(cors({
  origin: function(origin, callback) {
    // Autoriser toutes les origines localhost en développement
    if (!origin || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else if (process.env.FRONT_URL && origin === process.env.FRONT_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Permet l'envoi de cookies
}));

// Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Route de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'FPBG Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes de l'API
app.use('/api/auth', authRoutes);  // ✅ Changé de /api à /api/auth
app.use('/api/aprojet-v1', projetRoutes);
app.use('/api/organisations', organisationRoutes);
app.use('/api/aap', aapRoutes);

// Middleware pour les routes non trouvées
app.use(notFoundHandler);

// Middleware de gestion des erreurs (doit être en dernier)
app.use(errorHandler);

// Démarrage du serveur
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Serveur FPBG lancé sur le port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);
});

export default app;
