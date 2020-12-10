const path = require('path');
const http = require('http');
//Load express
const express = require('express');
//Load Socket.Io
const socketio = require('socket.io');
//Package to check profanity in messages
const Filter = require('bad-words');

const app = express(); //Call express function to create app
const server = http.createServer(app);//Create express server explicitly
const io = socketio(server);//Initailize socket IO with http server

const port = process.env.PORT || 3000; //Calculate the port based on IP
const publicDirectoryPath = path.join(__dirname,"../public");//serve contents from public folder
const {generateMessage,generateLocationMessage} = require('./utils/messages');
const {addUser,removeUser,getUser,getUsersInRoom} = require('./utils/users');

//configure express server
app.use(express.static(publicDirectoryPath));

//let count = 0;

//Initialize web socket connection
io.on('connection',(socket)=>{
    console.log('New web socket connection');
    //socket.emit('countUpdated',count);//Emit new event which will be recieved by all the clients.

    //Recieve event emitted by client
    /*socket.on('increment',()=>{
        count++;
        io.emit('countUpdated',count); //emit event to all the clients by using io
    })*/
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })
        if (error) {
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    //socket.broadcast.emit('message',generateMessage('A new user has entered the chat'));//Use this to emit message except the current client

     //Recieve event emitted by client
     socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    });

     //Recieve event emitted by client for location
     socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    });

    //Emit event to other clients when a user is disconnected
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    });
});

server.listen(port,()=>{
    console.log("Server started");
});
