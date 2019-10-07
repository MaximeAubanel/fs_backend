import { Socket } from 'socket.io';

export const enum STATUS {
    IDLE = "IDLE",
    READY = "READY",
    PLAYING = "PLAYING"
}

export class ServerUser {
    username: string;
    socket: Socket;

    status: STATUS;
    roomId: number;
    dir_X: number;
    dir_Y: number;
    x: number;
    y: number;

    constructor(username: string, socket: Socket, roomId: number) {
        this.username = username;
        this.socket = socket;

        this.status = STATUS.IDLE;
        this.roomId = roomId;
        this.dir_X = null;
        this.dir_Y = null;
        this.x = null;
        this.y = null;
    }
}
