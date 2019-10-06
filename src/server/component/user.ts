import { Socket } from 'socket.io';

export default class User {
    username: string;
    socket: Socket;

    roomId: number;
    isReady: boolean;
    dir_X: number;
    dir_Y: number;
    x: number;
    y: number;

    constructor(username: string, socket: Socket, roomId: number) {
        this.username = username;
        this.socket = socket;

        this.roomId = roomId;
        this.isReady = false;
        this.dir_X = null;
        this.dir_Y = null;
        this.x = null;
        this.y = null;
    }
}
