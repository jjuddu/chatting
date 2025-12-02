// chat.js 상단에 추가 (서버 URL은 실제 서버 주소로 변경)
const socket = io('http://localhost:3000'); // 예시: Node.js 서버가 3000번 포트에서 실행 중이라고 가정

// 필요한 DOM 요소 가져오기
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messageList = document.getElementById('message-list');

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
function sendMessage() {
    const text = messageInput.value.trim();

    if (text === '') {
        return;
    }

    // 1. 서버로 메시지 전송 (Socket.io 사용)
    socket.emit('send_message', { 
        text: text, 
        senderId: MY_USER_ID, // 발신자 정보 전송
        // 여기에 roomId 등 랜덤 채팅에 필요한 정보를 추가해야 합니다.
    }); 

    // 2. 입력창 비우기
    messageInput.value = '';

    // 3. 스크롤 내리기 (내가 보낸 메시지를 바로 표시하므로)
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

// 초기 테스트 메시지를 추가하고 싶다면 여기에 추가
createMessageElement('새로운 프로젝트를 시작합니다!', MY_USER_ID);
createMessageElement('좋아요, 기능부터 빠르게 구현해 봅시다.', OTHER_USER_ID);
scrollToBottom();

socket.on('receive_message', (data) => {
    // 상대방이 보낸 메시지인 경우에만 화면에 표시
    if (data.senderId !== MY_USER_ID) {
        createMessageElement(data.text, OTHER_USER_ID);
        scrollToBottom();
    }
    // 참고: 내가 보낸 메시지는 서버를 거쳐 다시 받지 않고, 전송 직후 로컬에서 바로 표시했습니다.
});