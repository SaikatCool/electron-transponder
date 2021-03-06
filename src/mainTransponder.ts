import { requestMethods } from './requestMethods';

interface IObject {
  [key:string]: any
}

interface Routes {
  [key:string]: IObject
}

interface Handler {
  (req: any, res: any): Promise<any>
}

interface BootstrapRoute {
  action: string,
  route: string,
  handler: Handler
}

type BootstrapRoutes = BootstrapRoute[];

export class mainTransponder {
  routes: Routes;

  constructor(private ipcMain, routes: BootstrapRoutes = []) {
    this.initializeRoutes(routes);

    console.log("Listening to messages");
    ipcMain.on("asynchronous-message", (event, arg) => {
      this.pong(event, arg);
      this.messageHandler(event, arg);
    });
  }

  initializeRoutes(routes: any[]) {
    const routeTypes = Object.keys(requestMethods);

    this.routes = {};

    routeTypes.map(requestMethod => {
      this.routes[requestMethod] = {};
    });

    routes.forEach(route => {
      this.register(route.action, route.route, route.handler);
    })
  }

  pong(event, arg) {
    if (arg === "PING") {
      console.log("PING");
      return event.sender.send("asynchronous-reply", "PONG");
    }
  }

  register(action, route, handler) {
    this.validateRoute(action, route, handler);

    this.routes[action][route] = handler;
  }

  private messageHandler(event, arg) {
    let isValid = this.validateMessage(arg);

    if (!isValid) {
      console.error("Message not valid");
      return;
    }

    let handler = this.matchHandler(arg);
    let req = this.buildRequest(event, arg);
    let res = this.buildResponse(event, arg);

    handler(req, res).then(() => {});
  }

  validateRoute(action, route, handler) {
    if (!this.routes[action]) {
      throw new Error("Route type not supported");
    }

    if (this.routes[action][route]) {
      throw new Error("Route already registered");
    }
  }

  validateMessage(data) {
    if (data.action && data.route) {
      return true;
    }

    return false;
  }

  matchHandler(data) {
    if (this.routes[data.action][data.route]) {
      return this.routes[data.action][data.route];
    }

    return this.notFoundHandler;
  }

  notFoundHandler(req, res) {
    return res.sendStatus(404, "Route not found");
  }

  buildRequest(event, arg) {
    return {
      ...arg
    };
  }

  buildResponse(event, arg) {
    return {
      send: this.sendMessage(event, arg),
      sendStatus: this.sendStatus(event, arg),
      broadcast: this.broadcastMessage(event, arg)
    };
  }

  sendMessage(event, arg) {
    return (message: any) => {
      event.sender.send("asynchronous-reply", {
        ...arg,
        status: 200,
        data: message
      });
    };
  }

  sendStatus(event, arg) {
    return (statusCode: number, message?: any) => {
      event.sender.send("asynchronous-reply", {
        ...arg,
        status: statusCode,
        message
      });
    };
  }

  broadcastMessage(event, arg) {
    return (message: any) => {
      event.sender.send("asynchronous-reply", {
        ...arg,
        status: 200,
        global: true,
        data: message
      });
    };
  }
}
