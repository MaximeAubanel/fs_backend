import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayDisconnect,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ServerService } from './server.service';
import { SERVER_ENDPOINT } from './endpoint'


@WebSocketGateway({ namespace: '/lobby' })
export class ServerGateway implements OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer() server: Server;
  constructor(private readonly _ServerService: ServerService) {}
  async afterInit() {
    await this._ServerService.init(this.server);
  }

  /////////////
  // GENERAL //
  /////////////
  @SubscribeMessage(SERVER_ENDPOINT.LOGIN)
  async login(socket: Socket, user: { username: string, password: string, token: string}) {
    await this._ServerService.login(socket, user);
  }
  async handleDisconnect(socket: Socket) {
    await this._ServerService.logout(socket);
  }
  @SubscribeMessage(SERVER_ENDPOINT.MESSAGE_SERVER)
  async messageServer(socket: Socket, message: string) {
    await this._ServerService.messageServer(socket, message);
  }

  /////////////
  /// ROOM ////
  /////////////
  @SubscribeMessage(SERVER_ENDPOINT.JOIN_ROOM)
  async joinRoom(socket: Socket, room: string) {
    await this._ServerService.joinRoom(socket, room);
  }
  @SubscribeMessage(SERVER_ENDPOINT.LEAVE_ROOM)
  async leaveRoom(socket: Socket, room: string) {
    await this._ServerService.leaveRoom(socket, room);
  }
  @SubscribeMessage(SERVER_ENDPOINT.MESSAGE_ROOM)
  async message(socket: Socket, data: { roomName: string, message: string }) {
    await this._ServerService.message(socket, data.roomName, data.message);
  }

  /////////////
  /// GAME ////
  /////////////
  @SubscribeMessage(SERVER_ENDPOINT.TOGGLE_READY)
  async toggleReady(socket: Socket, isReady: boolean) {
    await this._ServerService.toggleReady(socket, isReady);
  }
  @SubscribeMessage(SERVER_ENDPOINT.UPDATE_DIR)
  async updateDirection(socket: Socket, key: number) {
    await this._ServerService.updateDirection(socket, key);
  }
}
