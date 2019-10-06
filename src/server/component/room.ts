import User from "./user"
import { Server } from 'socket.io';
import { CLIENT_ENDPOINT } from "../endpoint"

const MAP_SIZE = 100

enum STATUS {
    IDLE,
    PLAYING,
    GAME_OVER
}

export class Room {
    public name: string;
    public status: STATUS;

    private server: Server;
    private engineTicker: number;
    private users: User[];
    private map: number[][];

    constructor(name: string, server: Server) {
        this.name = name;
        this.status = STATUS.IDLE;

        this.server = server;
        this.engineTicker = null;
        this.users = new Array<User>();        
        this.map = new Array(MAP_SIZE).fill(0).map(() => new Array(MAP_SIZE).fill(0));
    }

    public join(user: User): boolean {
        try {
            this.users.push(user);
            console.log("[ " + user.username +" ] joined the room")
            return true
        } catch (e) {
            console.warn("[ " + user.username +" ] failed to join the room")
            console.warn(e)
            return false
        }
    }

    public leave(user: User): boolean {
        try {
            this.users = this.users.filter(tmpUser => (
                tmpUser.socket.id !== user.socket.id)
            );
            console.log("[ " + user.username +" ] left the room")
            return true;
        } catch (e) {
            console.warn("[ " + user.username +" ] failed to leave the room")
            console.warn(e)
            return false;
        }
    }

    /////////////
    /// GAME ////
    /////////////

    private startGame(): void {
        if (this.status === STATUS.PLAYING) {
            return console.warn('Game already in progress, ignoring...');
        }

        this.resetGame();
        this.status = STATUS.PLAYING;
        
        this.users.forEach(tmpUser => {
            while (
                !this.updatePlayerPos(tmpUser, this.randInRange(0, MAP_SIZE), this.randInRange(0, MAP_SIZE))
            ) {}
            tmpUser.dir_X = Math.round(Math.random()) * 2 - 1;
            tmpUser.dir_Y = 0;
        })
        this.engineTicker = <any>setInterval(() => this.tick(), 100);
    }

    private stopGame() {
        clearInterval(this.engineTicker);
        this.engineTicker = null;
        this.status = STATUS.IDLE;
    }

    private tick() {
        // TODO ADD CHECK END
        if (this.status === STATUS.GAME_OVER) {
          this.stopGame();
        }
    
        var myObject = []
        this.users.forEach(user => {
          myObject.push({
              x : user.x,
              y : user.y,
              gameId: user.roomId
          })
          this.updatePlayerPos(user, user.x + user.dir_X, user.y + user.dir_Y)
        })
        this.sendDataToAll(CLIENT_ENDPOINT.UPDATE_GAME, myObject)
      }

    public toggleReady(user: User, isReady: boolean): void {
        this.users.forEach(tmpUser => {
            if (tmpUser.socket.id === user.socket.id) {
                tmpUser.isReady = isReady;
            }
        })
    }

    private isRoomReadyToPlay(): boolean {
        this.users.forEach(user => {
            if (!user.isReady) return false;
        })
        if (this.users.length < 2) return false;
        return true;
    }

    private updatePlayerPos(user: User, x: number, y: number): boolean {
        if (
          x < 0 ||
          x >= MAP_SIZE ||
          y < 0 ||
          y >= MAP_SIZE ||
          this.map[y][x] !== 0
        )
          return false;
        this.map[y][x] = user.roomId;
        user.x = x;
        user.y = y;
        return true;
    }

    public resetGame() {
        this.map = new Array(MAP_SIZE).fill(0).map(() => new Array(MAP_SIZE).fill(0));
    }

    /////////////
    // NETWORK //
    /////////////

    public message(message: String) {
        this.sendDataToAll(CLIENT_ENDPOINT.MESSAGE, message);
    }

    private updateRoomState() {
        this.sendDataToAll(CLIENT_ENDPOINT.UPDATE_ROOM, {
            users: this.getUsers(),
            status: this.status
        })
    }

    private sendDataToAll(header: string, data: any) {
        this.server.to(this.name).emit(header, data);
    }

    /////////////
    /// UTILS ///
    /////////////

    private getUsers(): any[] {
        var users = []
        this.users.forEach(user => {
            users.push({
                username: user.username,
                roomId: user.roomId,
                isReady: user.isReady
            })
        })
        return users;
    }

    private randInRange(min: number, max: number) {
        // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
      }
}