import { Injectable } from '@nestjs/common';
import { User, MessageFromClient, MessageFromServer, ToggleReadyFromClient, GameDirUpdateFromClient } from '../dtos';
import { UsersService } from '../users/users.service';
import { Socket, Server } from 'socket.io';
import { ServerUser, STATUS as USER_STATUS } from "./component/user"
import { Room } from "./component/room"

class AppServer {
  users: ServerUser[] = [];
  rooms: Room[] = [];
}

@Injectable()
export class ServerService {
  constructor(private readonly _UsersService: UsersService) {}

  private _AppServer = new AppServer();
  private server: Server;

  async init(server: Server) { this.server = server; }

  async login(socket: Socket, user: User): Promise<void> {
    try {
      user = await this._UsersService.loginWithToken(
        user.username,
        user.password,
        user.token,
      );

      var newUser: ServerUser = {
        username: user.username,
        socket: socket,

        roomId: 0,
        status: USER_STATUS.IDLE,
        dir_X: 1,
        dir_Y: 0,
        x: 0,
        y: 0,
      };
      this._AppServer.users.push(newUser);
    } catch (e) {
      console.log(e.message);
    }
  }

  async logout(socket: Socket): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    await this.removeUserFromAll(user);
  }

  /////////////////
  //// GENERAL ////
  /////////////////

  async joinRoom(socket: Socket, roomName: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    var room = await this.getRoom(roomName)
    room.join(user);
  }

  async leaveRoom(socket: Socket, roomName: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    var room = await this.getRoom(roomName)
    room.leave(user);
  }

  async message(socket: Socket, message: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    // TODO -> Message to all server
  }

  /////////////////
  ///// GAME //////
  /////////////////

  async toggleReady(socket: Socket, isReady: boolean): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    for (var room of this._AppServer.rooms) {
      if (room.isUserInTheRoom(user)) {
        room.toggleReady(user, isReady)
        room.checkStartGame()
        return
      }
    }
  }

  async updateDirection(socket: Socket, key: number): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    for (var room of this._AppServer.rooms) {
      if (room.isUserInTheRoom(user)) {
        room.updateDirection(user, key)
        return
      }
    }
  }

  /////////////////
  ///// UTILS /////
  /////////////////

  private async getRoom(roomName: string): Promise<Room> {
    for (var room of this._AppServer.rooms) {
      if (room.name === roomName) {
        return room
      }
    }
    var newRoom = new Room(roomName, this.server)
    this._AppServer.rooms.push(newRoom)
    return newRoom
  }

  private async getUserFromSocket(socket: Socket): Promise<ServerUser> {
    return this._AppServer.users.find(user => user.socket.id === socket.id);
  }

  private async removeUserFromAll(user: ServerUser): Promise<void> {
    this._AppServer.rooms.forEach(room => {
      if (room.isUserInTheRoom(user)) {
        room.leave(user)
        this._AppServer.users = this._AppServer.users.filter(tmpUser => (
          tmpUser.username !== user.username)
        );
        return
      }
    })
  }

}
