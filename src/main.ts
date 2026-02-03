import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      // 1. Permitir peticiones sin origen (Postman/Server-to-server)
      if (!origin) return callback(null, true);

      // 2. Obtener la URL configurada en Railway
      const configuredFrontend = process.env.FRONTEND_URL;

      // 3. Definir dominios permitidos (Railway + Localhost + Regex para Vercel)
      const allowedOrigins = [
        configuredFrontend,
        'http://localhost:4200',
        'http://127.0.0.1:4200'
      ];

      const isVercelSubdomain = /^(https?:\/\/.*\.vercel\.app)$/.test(origin);

      if (allowedOrigins.includes(origin) || isVercelSubdomain) {
        callback(null, true);
      } else {
        console.error(`CORS Bloqueado para: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Railway usa la variable PORT automáticamente
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Stock360 API activa en puerto: ${port}`);
}
bootstrap();