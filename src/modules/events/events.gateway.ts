import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayDisconnect,
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketServer,
} from '@nestjs/websockets';
import { EventsService } from './events.service';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: '*',
    allowedHeaders: '*',
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly eventsService: EventsService) {}

  @SubscribeMessage('request.onlines')
  async onRequestOnlines() {
    return await this.getRoomMembers('online');
  }

  async afterInit() {
    console.log('Websocket Init');
  }

  async handleDisconnect(socket: Socket) {
    console.log(`Client disconnected: ${socket.id}`);
    this.leaveRoom(socket, 'online');
  }

  async handleConnection(socket: Socket) {
    console.log(`Client connected: ${socket.id}`);

    try {
      socket.data.user = JSON.parse(socket.handshake.query?.user as string);
    } catch (error) {
      console.log(error);
    }

    this.joinRoom(socket, 'online');
  }

  async joinRoom(socket: Socket, room: string) {
    socket.join(room);

    const members = await this.getRoomMembers(room);

    this.server.sockets.emit(`${room}.joined`, {
      members,
      room,
    });
  }

  async leaveRoom(socket: Socket, room: string) {
    socket.leave(room);

    const members = await this.getRoomMembers(room);

    this.server.sockets.emit(`${room}.left`, {
      members,
      room,
    });
  }

  async getRoomMembers(room: string) {
    const members = this.server.sockets.adapter.rooms.get(room);
    const memberSockets = (await this.server.sockets.fetchSockets()).filter(
      ({ id }) => Array.from(members).includes(id),
    );

    return memberSockets.map(({ data }) => data?.user);
  }
}
