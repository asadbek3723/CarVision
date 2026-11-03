import net from 'net';

const server = net.createServer((socket) => {
  const client = net.createConnection({ port: 3000 }, () => {
    socket.pipe(client);
    client.pipe(socket);
  });
  client.on('error', () => socket.destroy());
  socket.on('error', () => client.destroy());
});

server.listen(3001, () => {
  console.log('Proxy active: http://localhost:3001 -> http://localhost:3000');
});
