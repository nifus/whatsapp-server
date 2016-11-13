var args = process.argv.slice(2);
var re = /port=(\d+)/i
var port=3000;
for( var i in args ){
    if ( args[i].match(re) ){
        port = args[i].match(re)[1];
    }
}

var client_host = null;
var connected = [];

var fs = require( 'fs' );
var app = require('express')();
if ( args.indexOf('ssl')==-1){
    var http        = require('http');
    var server = http.createServer();
    server.listen(port);
}else{
    var https        = require('https');
    var server = https.createServer({
            key: fs.readFileSync(__dirname + '/key.pem'),
            cert: fs.readFileSync(__dirname + '/cert.pem')
    },app);
    server.listen(port);
}



var io = require('socket.io').listen(server);


function findUser(user) {
    for (var i in connected) {
        if (connected[i].user == user) {
            return true;
        }
    }
    return false;
}




io.on('connection', function (socket) {

    //var handshakeData = socket.request;
    //client_host = handshakeData._query['host'];

   // console.log('a user connected '+client_host);
  // socket.join(client_host);

    io.sockets.emit('connect', socket.id);

    //  клиент отключился, по его ID исключаем его из массива
    socket.on('disconnect', function (value ) {

            connected = connected.filter(function (rec) {
                if (rec.socket !== socket.id) {
                    return true;
                }
                return false;
            });

            io.sockets.emit('debug', connected.length);

        //  оповещаем всех что изменился список
        io.sockets.emit('who_is_online', connected);
    
    });
    


    //  новое сообщение
    socket.on('message', function (obj) {
        var send = false;
        if (obj.user_to!=undefined){
            for( var i in connected ){
                if (connected[i].user===obj.user_to ){
                    io.to(connected[i].socket).emit('reload', obj);
                    send = true;
                    break;
                }
            }
        }
        if ( send==false ){
            socket.broadcast.emit('reload', obj);
        }
    });

    socket.on('message-delete', function (obj) {
        var send = false;
        if (obj.user_to!=undefined){
            for( var i in connected ){
                if (connected[i].user===obj.user_to ){
                    io.to(connected[i].socket).emit('message:delete', obj);
                    send = true;
                    break;
                }
            }
        }
        if ( send==false ){
            socket.broadcast.emit('message:delete', obj);
        }
    });

    //  Новый чат
    socket.on('client:create-chat', function (chat, users) {
        for( var i in users){
             for( var j in connected ){
                if (connected[j].user===users[i] ){
                    io.to(connected[j].socket).emit('server:create-chat', chat);
                }
            }
        }
    });


    socket.on('client:chat-delete', function (response) {
        var users = response.users;
        var chat = response.chat;
            for( var i in connected ){
                if ( users.indexOf(connected[i].user)!==-1 ){
                    io.to(connected[i].socket).emit('server:chat-delete', chat);
                }
            }
    });

    // чтение сообщений в чате
    socket.on('client:read_chat', function (obj) {
        var send = false;
        if (obj.user_to!=undefined){
            for( var i in connected ){
                if (connected[i].user===obj.user_to ){
                    io.to(connected[i].socket).emit('server:read_chat', obj.chat_id);
                    send = true;
                    break;
                }
            }
        }
        if ( send==false ){
            socket.broadcast.emit('server:read_chat', obj.chat_id);
        }

    });

    // клиент залогинился
    socket.on('client:signin', function (user_id) {
        socket.broadcast.emit('server:signin', user_id);
    });

    //  клиент сообщает свой ID
    // сервер в ответ рассказывает ему кто сейчас в сети
    socket.on('client:connect', function (user_id) {
        if (!findUser(user_id)) {
           // connected = connected[client_host]==undefined ? connected[client_host]=[] : connected[client_host];
            connected.push({user: user_id, socket: socket.id});
        }
        io.sockets.emit('who_is_online', connected);
        io.sockets.emit('debug', 'User connected '+user_id);
    });
    




});

