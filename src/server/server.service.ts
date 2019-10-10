import { Injectable } from '@nestjs/common';
import { User, MessageFromClient, MessageFromServer, ToggleReadyFromClient, GameDirUpdateFromClient } from '../dtos';
import { UsersService } from '../users/users.service';
import { Socket, Server } from 'socket.io';
import { ServerUser, STATUS as USER_STATUS } from "./component/user"
import { Room } from "./component/room"
import { CLIENT_ENDPOINT } from './endpoint';
import { objectExpression } from '@babel/types';

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

  async login(socket: Socket, user: any): Promise<void> {
    try {
      user = await this._UsersService.loginWithToken(
        user.username,
        user.password,
        user.token,
      );

      var newUser: ServerUser = {
        username: user.username,
        socket: socket,

        id: 0,
        status: USER_STATUS.IDLE,
        dir_X: 1,
        dir_Y: 0,
        x: 0,
        y: 0,
      };
      this._AppServer.users.push(newUser);
      this.updateUserAboutRooms(socket)
    } catch (e) {
      console.log(e.message);
    }
  }

  async logout(socket: Socket): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    await this.removeUserFromAll(user);
    console.log("Online User: " + this._AppServer.users.length)
    console.log("Room Availble: " + this._AppServer.rooms.length)
  }

  async messageServer(socket: Socket, message: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    this.server.emit(CLIENT_ENDPOINT.MESSAGE_SERVER, user.username + ": " + message)
  }

  /////////////////
  //// GENERAL ////
  /////////////////

  async joinRoom(socket: Socket, roomName: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    var room = await this.getRoomCreate(roomName)
    room.join(user);
    this.updateAllUserAboutRooms()
  }

  async leaveRoom(socket: Socket, roomName: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;

    var room = await this.getRoom(roomName)
    if (room === null || !room.isUserInTheRoom(user)) return;

    room.leave(user);
  }

  async message(socket: Socket, roomName: string, message: string): Promise<void> {
    var user: ServerUser = await this.getUserFromSocket(socket);
    if (user === undefined) return;
   
    var room: Room = await this.getRoom(roomName);
    if (room === null || !room.isUserInTheRoom(user)) return;

    room.message(user.username + ": " + message)
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

  private async updateUserAboutRooms(socket: Socket): Promise<void> {
    socket.emit(CLIENT_ENDPOINT.UPDATE_ROOMS, await this.getRoomsInfo())
  }

  private async updateAllUserAboutRooms(): Promise<void> {
    this.server.emit(CLIENT_ENDPOINT.UPDATE_ROOMS, await this.getRoomsInfo())
  }

  private async getRoomsInfo(): Promise<any> {
    var data = []

    console.log(this._AppServer.rooms.length)
    for (var room of this._AppServer.rooms) {
      data.push({
        name: room.name,
        userNb: room.getUsersNb()
      })
    }
    return data
  }

  private async getRoomCreate(roomName: string): Promise<Room> {
    for (var room of this._AppServer.rooms) {
      if (room.name === roomName) {
        return room
      }
    }
    var newRoom = new Room(roomName, this.server)
    this._AppServer.rooms.push(newRoom)
    return newRoom
  }

  private async getRoom(roomName: string): Promise<Room> {
    for (var room of this._AppServer.rooms) {
      if (room.name === roomName) {
        return room
      }
    }
    return null
  }

  private async getUserFromSocket(socket: Socket): Promise<ServerUser> {
    return this._AppServer.users.find(user => user.socket.id === socket.id);
  }

  private async removeUserFromAll(user: ServerUser): Promise<void> {
    this._AppServer.rooms.forEach(room => {
      if (room.isUserInTheRoom(user)) {
        room.leave(user)
      }
    })

    // Remove player from global user list
    this._AppServer.users = this._AppServer.users.filter(tmpUser => (
      tmpUser.username !== user.username)
    );

    // Delete empty rooms
    var tmpNb = this._AppServer.rooms.length
    this._AppServer.rooms = this._AppServer.rooms.filter(tmpRoom => (
      tmpRoom.getUsersNb() !== 0)
    );
    if (tmpNb !== this._AppServer.rooms.length) {
      this.updateAllUserAboutRooms()
    }
  }
}
