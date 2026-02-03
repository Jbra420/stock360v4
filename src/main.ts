import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS corregida para Stock360
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como Postman o llamadas internas)
      if (!origin) return callback(null, true);

      // Esta expresión regular permite:
      // 1. Cualquier subdominio de .vercel.app (tus despliegues de Vercel)
      // 2. localhost y 127.0.0.1 (para tus pruebas locales en Angular)
      const allowedRegex = /^(https?:\/\/(.*\.vercel\.app|localhost|127\.0\.0\.1)(:\d+)?)$/;

      if (allowedRegex.test(origin)) {
        callback(null, true);
      } else {
        // Imprime en los logs de Railway cuál es el origen que está siendo bloqueado
        console.error(`CORS Bloqueado: El origen ${origin} no está permitido.`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configuración del puerto para Railway
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend de Stock360 corriendo en el puerto: ${port}`);
}
bootstrap();