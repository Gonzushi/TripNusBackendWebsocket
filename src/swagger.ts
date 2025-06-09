import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import path from "path";

const apiPath =
  process.env.NODE_ENV === "production"
    ? path.join(__dirname, "routes/*.js")
    : path.join(__dirname, "../src/routes/*.ts");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TripNus Backend Websocket",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [apiPath],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
