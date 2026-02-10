export const SERVER_CLI_FLAG = {
  SERVER: "--server",
  PORT: "--port",
  HOST: "--host",
} as const;

export type ServerCliFlag = (typeof SERVER_CLI_FLAG)[keyof typeof SERVER_CLI_FLAG];

export const { SERVER: SERVER_FLAG, PORT: PORT_FLAG, HOST: HOST_FLAG } = SERVER_CLI_FLAG;
