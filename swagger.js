import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce API',
      version: '1.0.0',
      description: 'API documentation for your e-commerce platform',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local server'
      },
      {
        url: 'http://192.168.18.23:5000',
        description: 'Network server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ BearerAuth: [] }],
  },
  apis: [
    './routes/*.js',
    './controllers/*.js'
  ],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app) => {
  // Custom CSS to ensure assets load over HTTP
  const customCss = '.swagger-ui .topbar { display: none }';
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss,
    customSiteTitle: "E-commerce API Docs",
    swaggerOptions: {
      persistAuthorization: true,
    }
  }));
};