// chat.js 상단에 추가 (기존 코드 앞에)
const socket = io('https://my-random-chat-server.onrender.com'); // 서버 주소와 포트 연결
let currentRoomId = null; // 현재 참여하고 있는 채팅방 ID
let isMatching = false; // 매칭 중인지 확인하는 플래그
// (MY_USER_ID, OTHER_USER_ID 상수는 그대로 사용)

// 필요한 DOM 요소 가져오기
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messageList = document.getElementById('message-list');
const userInfo = document.getElementById('user-info')
const exitButton = document.getElementById('exit-button')

// **가상의 사용자 ID 설정** (내가 보낸 메시지를 구분하기 위함)
const MY_USER_ID = 'me';
const OTHER_USER_ID = 'other';

/**
 * 새로운 메시지 요소를 생성하고 채팅 목록에 추가하는 함수
 * @param {string} text - 메시지 내용
 * @param {string} sender - 메시지 발신자 ID ('me' 또는 'other')
 */
function createMessageElement(text, sender) {
    // 1. 현재 시간 포맷팅 (HH:MM)
    // padStart(n, '문자') 문자열 길이가 n이 될 때까지 '문자'를 넣는다.
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');

    // 2. 메시지 HTML 구조 생성
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    // classList는 객체이고, 고유한 메서드 중 add메서드를 사용함.
    // 새로운 객체에도 동일한 클래스를 적용시키기 위해 사용.
    
    // 발신자에 따라 클래스 추가
    if (sender === MY_USER_ID) {
        messageDiv.classList.add('my-message');
    } else {
        messageDiv.classList.add('their-message');
    }

    messageDiv.innerHTML = `
        <div class="message-content">${text}</div>
        <div class="message-time">${timeString}</div>
    `;

    // 3. 채팅 목록에 추가
    messageList.appendChild(messageDiv);
}

/**
 * 스크롤을 항상 최신 메시지로 내리는 함수
 */
function scrollToBottom() {
    messageList.scrollTop = messageList.scrollHeight;
}

/**
 * 메시지 전송 처리 함수
 */
// chat.js 파일 내 sendMessage 함수 수정

function sendMessage() {
    const text = messageInput.value.trim();

    if (text === '' || !currentRoomId) { // 메시지가 비었거나 방에 없으면 전송 X
        return; 
    }

    // 1. 내 메시지를 먼저 화면에 표시
    createMessageElement(text, MY_USER_ID); //

    // 2. 서버로 메시지 전송 (emit)
    socket.emit('message', {
        roomId: currentRoomId, // 현재 방 ID
        msg: text             // 메시지 내용
    });

    // 3. 입력창 비우기 및 스크롤
    messageInput.value = ''; 
    scrollToBottom();
    
}


// **이벤트 리스너 연결**

// 1. '전송' 버튼 클릭 시
sendButton.addEventListener('click', sendMessage);

// 2. 입력창에서 Enter 키 입력 시
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 페이지 로드 시 스크롤을 가장 아래로 내림
window.addEventListener('load', scrollToBottom);

scrollToBottom();

// 나가기 버튼 누를 시 초기화면으로 복귀 및 상대방에게 연결 끊김 알리기
exitButton.addEventListener('click', (e) => {
    currentRoomId = null;
    isMatching = false;
    sendButton.textContent = '매칭 시작';
    sendButton.removeEventListener('click', sendMessage);
    sendButton.addEventListener('click', startMatching);
})

// --------------------------------------
// 서버 소켓 이벤트 리스너
// --------------------------------------

// 1. 서버에 접속하자마자 매칭 요청
socket.on('connect', () => {
    console.log('서버에 연결되었습니다.');
    if (!isMatching) {
        // "전송" 버튼을 "매칭 시작" 버튼으로 재활용합니다.
        sendButton.textContent = '매칭 시작';
        sendButton.removeEventListener('click', sendMessage);
        sendButton.addEventListener('click', startMatching);
        
        // 초기 테스트 메시지 제거 (옵션)
        // messageList.innerHTML = '';
        scrollToBottom();
    }
});


// 2. 매칭 시작 버튼 클릭 시 작동할 함수
function startMatching() {
    if (isMatching) return;
    
    isMatching = true;
    // ⭐⭐ 추가된 부분: 헤더 업데이트 ⭐⭐
    userInfo.textContent = '⏳ 파트너를 찾고 있습니다...'; 
    
    sendButton.textContent = '매칭 중...';
    sendButton.disabled = true;
    
    // 서버로 매칭 요청 이벤트 전송
    socket.emit('join'); 
    
    createMessageElement('파트너를 찾고 있습니다. 잠시만 기다려주세요...', OTHER_USER_ID);
    scrollToBottom();
}


// 3. 서버가 'waiting'을 보냈을 때 (나 혼자 대기 중)
socket.on('waiting', () => {
    sendButton.textContent = '매칭 중...';
    sendButton.disabled = true;
});


// 4. 서버가 'matched'를 보냈을 때 (매칭 성공!)
socket.on('matched', (roomId) => {
    currentRoomId = roomId; // 채팅방 ID 저장
    isMatching = false;
    
    userInfo.textContent = '👌👈 성공!!'
    // 버튼 기능을 원래대로 복구
    sendButton.textContent = '전송';
    sendButton.disabled = false;
    sendButton.removeEventListener('click', startMatching);
    sendButton.addEventListener('click', sendMessage); 
    
    // 화면에 알림 및 기존 메시지 지우기
    messageList.innerHTML = ''; 
    createMessageElement('🤝 파트너를 찾았습니다! 지금 바로 대화를 시작하세요.', OTHER_USER_ID);
    scrollToBottom();
});


// 5. 서버로부터 메시지를 받았을 때
socket.on('message', (msg) => {
    // 상대방 메시지 표시
    createMessageElement(msg, OTHER_USER_ID); 
    scrollToBottom();
});

// 6. 상대방이 연결을 끊었을 때 (서버에서 구현 필요)
socket.on('partner_disconnected', (msg) => {
    currentRoomId = null;
    isMatching = false;
    createMessageElement(msg, OTHER_USER_ID);
    
    userInfo.textContent = '⚠️ 상대방이 나갔습니다. "새 김이삼장 찾기"를 눌러주세요.';
    // 다시 매칭 상태로 복구
    sendButton.textContent = '새 김이삼장';
    sendButton.disabled = false;
    sendButton.removeEventListener('click', sendMessage);
    sendButton.addEventListener('click', startMatching); 
});