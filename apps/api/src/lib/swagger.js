import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'FredoCloud Team Hub API',
      version: '1.0.0',
      description:
        'REST API powering the Collaborative Team Hub. Auth uses JWT in httpOnly cookies (`access_token`, `refresh_token`). Send credentials with every request.',
      contact: { email: 'hiring@fredocloud.com' },
    },
    servers: [
      { url: 'https://kanban-project-production-aab6.up.railway.app', description: 'Production' },
      { url: 'http://localhost:4000', description: 'Local' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string' }, details: { type: 'object' } },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        Workspace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            accentColor: { type: 'string' },
            ownerId: { type: 'string' },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
});
