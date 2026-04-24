const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

function swaggerDocs(app, port) {
  const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Project Học Nodejs",
        version: "1.0.0",
        description: "API xác thực người dùng với JWT",
      },
      servers: [
        {
          url: `${BASE_URL}/api`,
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    apis: ["./routes/*.js"], // đọc comment @swagger trong routes
  };

  const swaggerSpec = swaggerJsdoc(options);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  console.log(`Swagger: ${BASE_URL}/docs`);
}

module.exports = swaggerDocs;
