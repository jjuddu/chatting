// server.js

let waitingUser = null;
let activeRooms = {};
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

io.on('connection', (socket) => {
    console.log('누군가 접속했습니다:', socket.id);

    // 1. 매칭 요청이 들어왔을 때
    socket.on('join', () => {
        if (waitingUser) {
            // 대기자가 있으면 -> 매칭 성사!
            const roomId = waitingUser.id + '#' + socket.id;

            // 방 정보 저장 (activeRooms에 두 유저의 ID 저장)
            activeRooms[roomId] = [socket.id, waitingUser.id];
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
        
        // 1) 대기열에 있었다면 제거
        // 'waitingUser'가 현재 끊긴 소켓이라면 null로 설정
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }

        // 2) 현재 채팅방에 있는지 확인하고 상대방에게 알림
        // activeRooms 객체를 순회하며 끊긴 유저가 속한 방을 찾습니다.
        for (const roomId in activeRooms) {
            const participants = activeRooms[roomId];
            
            if (participants && participants.includes(socket.id)) {
                
                // 상대방 소켓 ID 찾기
                const partnerId = participants.find(id => id !== socket.id);
                
                // 상대방에게 알림 전송 (partner_disconnected 이벤트 발생)
                io.to(partnerId).emit('partner_disconnected', '상대방이 연결을 끊었습니다.');
                
                // 채팅방 정보 삭제 (다음 매칭을 위해 방 정보 초기화)
                delete activeRooms[roomId];
                console.log(`[강제 종료] 채팅방 종료 및 제거: ${roomId}`);
                break; // 방을 찾았으니 루프 종료
            }
        }
    });
    // 4. 클라이언트가 채팅방을 나갔을 때
    socket.on('leave_room', (data) => {
        const roomId = data.roomId;
        
        // 1) 나를 제외한 방 안의 사람에게 알림 전송
        // 'partner_disconnected' 이벤트는 chat.js에 이미 로직이 있습니다.
        socket.to(roomId).emit('partner_disconnected', '상대방이 채팅방을 나갔습니다.');

        // 2) activeRooms에서 해당 방 정보를 삭제
        delete activeRooms[roomId];

        // 3) 이 소켓을 방에서 나가게 처리
        socket.leave(roomId);

        // ⭐ 혹시 이 유저가 나가기 전에 대기열에 있었을 수도 있으므로 제거 ⭐
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }
        
        console.log(`[나가기] 방 ${roomId}에서 유저 ${socket.id}가 나갔습니다.`);
    });
});

// 서버 포트 4000번에서 시작
server.listen(4000, () => {
    console.log('--------------------------------------');
    console.log(' 채팅 서버가 4000번 포트에서 실행 중입니다');
    console.log('--------------------------------------');
});