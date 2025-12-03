// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // 모든 접속 허용

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "https://kmsj-random-chat.netlify.app/", // "*"로 하면 모든 주소에서 접속 허용 (나중에 보안을 위해 수정 가능 => 수정함)
        methods: ["GET", "POST"]
    }
});

// 대기열 변수
let waitingUser = null;

io.on('connection', (socket) => {
    console.log('누군가 접속했습니다:', socket.id);

    // 1. 매칭 요청이 들어왔을 때
    socket.on('join', () => {
        if (waitingUser) {
            // 대기자가 있으면 -> 매칭 성사!
            const roomId = waitingUser.id + '#' + socket.id;
            
            // 두 사람을 같은 방에 넣음
            socket.join(roomId);
            waitingUser.join(roomId);

            // 두 사람에게 매칭 성공 알림
            io.to(roomId).emit('matched', roomId);
            
            console.log('매칭 성공! 방 번호:', roomId);
            waitingUser = null; // 대기열 초기화
        } else {
            // 대기자가 없으면 -> 내가 대기자가 됨
            waitingUser = socket;
            socket.emit('waiting');
            console.log('대기 중:', socket.id);
        }
    });

    // 2. 메시지 전송 요청이 들어왔을 때
    socket.on('message', (data) => {
        // data: { roomId, msg }
        // 나를 제외한 방 안의 사람들에게 메시지 전송
        socket.to(data.roomId).emit('message', data.msg);
    });

    // 3. 연결이 끊겼을 때
    socket.on('disconnect', () => {
        console.log('접속 종료:', socket.id);
        if (waitingUser === socket) {
            waitingUser = null;
        }
    });
});

// 서버 포트 4000번에서 시작
server.listen(4000, () => {
    console.log('--------------------------------------');
    console.log(' 채팅 서버가 4000번 포트에서 실행 중입니다');
    console.log('--------------------------------------');
});