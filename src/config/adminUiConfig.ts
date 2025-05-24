const isProduction = process.env.NODE_ENV === "production";

export type BasicAuthentication = {
  type: "basic";
  username: string;
  password: string;
};

type Mode = "production" | "development";

const getAuthConfig = (): false | BasicAuthentication => {
  if (!isProduction) return false;

  return {
    type: "basic",
    username: process.env.ADMIN_UI_USER || "admin",
    password: process.env.ADMIN_UI_PASS || "admin",
  };
};

export const adminUiConfig: {
  auth: false | BasicAuthentication;
  mode: Mode;
} = {
  auth: getAuthConfig(),
  mode: isProduction ? "production" : "development",
};
