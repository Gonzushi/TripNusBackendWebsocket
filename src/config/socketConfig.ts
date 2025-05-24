import { ServerOptions } from "socket.io";

const PORT = process.env.PORT || 3001;

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: ["https://admin.socket.io", `http://localhost:${PORT}`],
    methods: ["GET", "POST"],
    credentials: true,
  },
};
