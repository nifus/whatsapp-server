var args = process.argv.slice(2);


var fs = require( 'fs' );
var app = require('express')();
if ( args.indexOf('ssl')==-1){
    var http        = require('http');
    var server = http.createServer();
    server.listen(3000);
}else{
    var https        = require('https');
    var server = https.createServer({
            key: fs.readFileSync(__dirname + '/key.pem'),
            cert: fs.readFileSync(__dirname + '/cert.pem')
    },app);
    server.listen(443);
}





var io = require('socket.io').listen(server);


var client_host = null;
var connected = {};




function findUser(host, user) {
    for (var i in connected[host]) {
        if (connected[host][i].user == user) {
            return true;
        }
    }
    return false;
}




io.on('connection', function (socket) {

    var handshakeData = socket.request;
    client_host = handshakeData._query['host'];

    console.log('a user connected '+client_host);
    socket.join(client_host);

    io.sockets.in(client_host).emit('connect');

    //  клиент отключился, по его ID исключаем его из массива
    socket.on('disconnect', function (value) {
        socket.leave(client_host);
        if (connected[client_host]!=undefined){
            connected[client_host] = connected[client_host].filter(function (rec) {
                if (rec.socket != socket.id) {
                    return true;
                }
                return false;
            });
        }
        //  оповещаем всех что изменился список
        io.sockets.in(client_host).emit('who_is_online', connected[client_host]);
    });


    //  новое сообщение
    socket.on('message', function (obj) {
        socket.broadcast.to(client_host).emit('reload', obj);
    });

    //  Новый чат
    socket.on('chat', function (chat, users) {
        socket.broadcast.to(client_host).emit('create_chat', {chat: chat, users: users});
    });

    // чтение сообщений в чате
    socket.on('client:read_chat', function (chat_id) {
        socket.broadcast.to(client_host).emit('server:read_chat', chat_id);
    });

    // клиент залогинился
    socket.on('client:signin', function (user_id) {
        socket.broadcast.to(client_host).emit('server:signin', user_id);
    });

    //  клиент сообщает свой ID
    // сервер в ответ рассказывает ему кто сейчас в сети
    socket.on('client:connect', function (user_id) {
        if (!findUser(client_host, user_id)) {
            connected[client_host] = connected[client_host]==undefined ? connected[client_host]=[] : connected[client_host];
            connected[client_host].push({user: user_id, socket: socket.id});
        }
        io.sockets.in(client_host).emit('who_is_online', connected[client_host]);
    });


});

