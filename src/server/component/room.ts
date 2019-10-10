import { ServerUser as User, STATUS as USER_STATUS } from "./user"
import { Server } from 'socket.io';
import { CLIENT_ENDPOINT } from "../endpoint"

const MAP_SIZE = 100

enum STATUS {
    IDLE = "IDLE",
    PLAYING = "PLAYING"
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
            user.id = this.users.length + 1;
            this.users.push(user);
            console.log("[ " + user.username +" ] joined the room")
            
            user.socket.join(this.name, () => { 
                this.updateRoomState()
             })
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
                tmpUser.username !== user.username)
            );
            console.log("[ " + user.username +" ] left the room")
            
            user.socket.leave(this.name, () => { 
                this.updateRoomState()
             })
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

        this.resetMap();
        this.status = STATUS.PLAYING;
        
        this.users.forEach(tmpUser => {
            tmpUser.status = USER_STATUS.PLAYING
            while (
                !this.updatePlayerPos(tmpUser, this.randInRange(0, MAP_SIZE), this.randInRange(0, MAP_SIZE))
            ) {}
            tmpUser.dir_X = Math.round(Math.random()) * 2 - 1;
            tmpUser.dir_Y = 0;
        })
        this.updateRoomState();
        this.engineTicker = <any>setInterval(() => this.tick(), 100);
    }

    private stopGame() {
        clearInterval(this.engineTicker);
        this.engineTicker = null;
        this.status = STATUS.IDLE;
    }

    private checkEndGame() {
        var nbInGame = this.users.length
        var nbStillPlaying = 0

        for (var user of this.users) {
            if (user.status === USER_STATUS.PLAYING) {
                nbStillPlaying = nbStillPlaying + 1;
            }
        }
        if (nbStillPlaying < 2) {
            this.status = STATUS.IDLE;
        }
    }

    private tick() {
        this.checkEndGame();
        if (this.status === STATUS.IDLE) {
          this.stopGame();
        }
    
        var myObject = []
        this.users.forEach(user => {
          myObject.push({
              x : user.x,
              y : user.y,
              gameId: user.id
          })
          if(!this.updatePlayerPos(user, user.x + user.dir_X, user.y + user.dir_Y)) {
            user.status = USER_STATUS.IDLE
          }
        })
        this.sendDataToAll(CLIENT_ENDPOINT.UPDATE_GAME, myObject)
      }

    public toggleReady(user: User, isReady: boolean): void {
        this.users.forEach(tmpUser => {
            if (tmpUser.username === user.username) {
                if (isReady === true) {
                    tmpUser.status = USER_STATUS.READY;
                } else {
                    tmpUser.status = USER_STATUS.IDLE;
                }
            }
        })
        this.updateRoomState();
    }

    public checkStartGame(): void {
        if (this.isRoomReadyToPlay()) {
            this.startGame()
        }
    }

    public async updateDirection(_user: User, key: number): Promise<void> {
        this.users.forEach(user => {
          if (_user.username === user.username) {
            // left arrow key
            if (key === 37 && user.dir_X === 0) {
              user.dir_X = -1;
              user.dir_Y = 0;
            }
            // up arrow key
            else if (key === 38 && user.dir_Y === 0) {
              user.dir_Y = -1;
              user.dir_X = 0;
            }
            // right arrow key
            else if (key === 39 && user.dir_X === 0) {
              user.dir_X = 1;
              user.dir_Y = 0;
            }
            // down arrow key
            else if (key === 40 && user.dir_Y === 0) {
              user.dir_Y = 1;
              user.dir_X = 0;
            }
          }
        })
    }

    private isRoomReadyToPlay(): boolean {
        for (var user of this.users) {
            if (user.status !== USER_STATUS.READY) return false;
        }

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
        this.map[y][x] = user.id;
        user.x = x;
        user.y = y;
        return true;
    }

    public resetMap() {
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

    public isUserInTheRoom(_user: User): boolean {
        for (var user of this.users) {
            if (_user.username === user.username) return true
        }
        return false;
    }

    private getUsers(): any[] {
        var users = []
        this.users.forEach(user => {
            users.push({
                username: user.username,
                id: user.id,
                status: user.status
            })
        })
        return users;
    }

    public getUsersNb(): number {
        return this.users.length
    }

    public isEmpty(): boolean {
        return this.users.length === 0
    }

    private randInRange(min: number, max: number) {
        // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}