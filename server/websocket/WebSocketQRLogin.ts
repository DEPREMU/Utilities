import {
  ResponseAuth,
  UsersWebSocketQR,
  LoginWithQRMobile,
  MessageWebSocketQRLogin,
} from "@types";
import chalk from "chalk";
import QRCode from "qrcode";
import { Logger } from "@common";
import { getStorageData } from "../routes/auth.ts";
import { fetchFromTable } from "../database/functions.ts";
import WebSocket, { WebSocketServer } from "ws";
import { decodeJWTToken, getJWTTokenAndUpload } from "../functions/auth.ts";

const usersActive: UsersWebSocketQR = {};

const getQRCode = async (json: LoginWithQRMobile): Promise<string> => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(json));

    return qrCodeDataURL;
  } catch (error) {
    Logger.error(chalk.red("Error generating QR code:"), error);
    return "";
  }
};

const handleLoginWithQR = async (
  messageByApp: LoginWithQRMobile,
  wsMobile: WebSocket,
) => {
  const messageToMobile: MessageWebSocketQRLogin<"sentByServer"> = {
    type: "status",
    status: "authenticated-web",
  };

  try {
    const { deviceId: deviceIdWeb, token: tokenMobile } = messageByApp;

    const wsWeb: WebSocket | undefined = usersActive[deviceIdWeb]?.ws;

    if (wsWeb?.readyState !== WebSocket.OPEN) {
      messageToMobile.status = "error";
      wsMobile.send(JSON.stringify(messageToMobile));
      return;
    }
    const message: MessageWebSocketQRLogin<"sentByServer"> = {
      type: "status",
      status: "authenticating",
    };
    wsWeb.send(JSON.stringify(message));

    const decoded = await decodeJWTToken(tokenMobile);
    if (!decoded || !deviceIdWeb) {
      messageToMobile.status = "error";
      wsMobile.send(JSON.stringify(messageToMobile));
      return;
    }

    const [fetchedUser, dataInsert] = await Promise.all([
      fetchFromTable({
        table: "Users",
        match: { userId: decoded.userId },
      }),
      getJWTTokenAndUpload({
        deviceId: deviceIdWeb,
        email: decoded.email,
        userId: decoded.userId,
        notificationToken: "mobile-" + deviceIdWeb,
      }),
    ]);
    if (
      !fetchedUser.data ||
      fetchedUser.data.length === 0 ||
      !dataInsert.data
    ) {
      messageToMobile.status = "error";
      wsMobile.send(JSON.stringify(messageToMobile));
      return;
    }

    const user: Partial<(typeof fetchedUser.data)[0]> = fetchedUser.data[0];
    delete user["password"];

    const storageValues = await getStorageData(
      decoded.userId,
      messageByApp.rememberMe,
      dataInsert.data[0].token,
    );

    if (!storageValues) {
      messageToMobile.status = "error";
      wsMobile.send(JSON.stringify(messageToMobile));
      return;
    }

    const responseAuth: ResponseAuth<"login"> = {
      success: true,
      user: user as ResponseAuth<"login">["user"],
      token: dataInsert.data[0].token,
      storageValues: storageValues || undefined,
    };

    if (wsWeb && wsWeb.readyState === WebSocket.OPEN) {
      const messageToWeb: MessageWebSocketQRLogin<"sentByServer"> = {
        type: "status",
        status: "authenticated",
        response: responseAuth,
      };
      wsWeb.send(JSON.stringify(messageToWeb));
      wsMobile.send(JSON.stringify(messageToMobile));
      return;
    }

    messageToMobile.status = "error";
    wsMobile.send(JSON.stringify(messageToMobile));
    return;
  } catch (error) {
    Logger.error(chalk.red("Error handling QR login:"), error);
    messageToMobile.status = "error";
  }
  wsMobile.send(JSON.stringify(messageToMobile));
};

const sendQrCode = async (
  rememberMe: MessageWebSocketQRLogin<"sentByApp">["rememberMe"],
  deviceId: string,
  ws: WebSocket,
) => {
  const qrCodeURL = await getQRCode({
    type: "scanned",
    token: "",
    deviceId,
    rememberMe: !!rememberMe,
  });

  usersActive[deviceId].qrCode.dataURL = qrCodeURL;

  const msg: MessageWebSocketQRLogin<"sentByServer"> = {
    type: "qr-code",
    dataURL: qrCodeURL,
  };
  ws.send(JSON.stringify(msg));
};

export const initWebSocketLoginQRCode = () => {
  const ws = new WebSocketServer({ noServer: true });

  ws.on("connection", (socket) => {
    let deviceId: string = "";

    socket.on("message", async (message) => {
      try {
        const msg = message.toString();
        const parsedMsg = JSON.parse(
          msg,
        ) as MessageWebSocketQRLogin<"sentByApp">;

        switch (parsedMsg.type) {
          case "scanned":
            handleLoginWithQR(parsedMsg, socket);
            break;
          case "init-web":
          case "init-mobile":
            {
              Logger.log(
                chalk.blue("New WebSocket connection for QR login"),
                parsedMsg.deviceId,
              );
              deviceId = parsedMsg.deviceId;
              usersActive[deviceId] = {
                ws: socket,
                qrCode: { dataURL: "", timeoutId: null },
              };

              if (parsedMsg.type === "init-web")
                sendQrCode(parsedMsg.rememberMe, deviceId, socket);
            }
            break;
          case "remember-me":
            if (!deviceId) return;
            sendQrCode(parsedMsg.rememberMe, deviceId, socket);
            break;
          default:
            break;
        }
      } catch (error) {
        Logger.error(chalk.red("Error processing WebSocket message:"), error);
        ws.close();
      }
    });

    socket.on("close", () => {
      socket.removeAllListeners();

      if (!deviceId) return;

      Logger.log(`WebSocket connection closed for deviceId: ${deviceId}`);
      const timeoutId = usersActive[deviceId]?.qrCode.timeoutId;
      if (timeoutId) clearTimeout(timeoutId);

      delete usersActive[deviceId];
    });
  });

  return ws;
};
