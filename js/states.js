const STATES = [
  {
    id: 'heavy',
    emoji: '😮‍💨',
    label: '오늘 좀 버거워요',
    battery: 15,
    theme: '#f3ddd3',
    messages: [
      '많이 힘드셨겠어요. 지금은 그냥 숨 고르는 것만으로도 충분해요.',
      '애쓰지 않아도 돼요. 잠깐 멈춰도 괜찮아요.',
      '오늘 몫은 이미 다 하셨어요. 잠깐 내려놓아도 돼요.',
    ],
  },
  {
    id: 'blank',
    emoji: '😶',
    label: '머리가 멍해요',
    battery: 30,
    theme: '#eee6da',
    messages: [
      '생각을 잠깐 꺼둬도 괜찮아요. 천천히 돌아오면 돼요.',
      '아무 생각 안 나도 괜찮아요. 그냥 잠깐 멈춰 있어도 돼요.',
      '머리가 쉬고 싶다는 신호예요. 잠깐 비워봐요.',
    ],
  },
  {
    id: 'sharp',
    emoji: '😤',
    label: '괜히 날카로워요',
    battery: 35,
    theme: '#f2ded6',
    messages: [
      '예민해질 수 있는 날이에요. 잠깐 거리를 두는 것도 좋아요.',
      '괜찮아요, 그런 날도 있어요. 잠깐 숨을 가다듬어봐요.',
      '날이 선 것도 몸이 보내는 신호예요. 잠깐 풀어봐요.',
    ],
  },
  {
    id: 'tired',
    emoji: '😪',
    label: '그냥 피곤해요',
    battery: 40,
    theme: '#efe4d6',
    messages: [
      '애쓰지 않아도 돼요. 잠깐 멈춰가도 괜찮아요.',
      '피곤함을 느낀다는 건 그만큼 애썼다는 뜻이에요.',
      '잠깐이라도 눈을 쉬게 해줘요.',
    ],
  },
  {
    id: 'down',
    emoji: '🌥️',
    label: '기분이 가라앉아요',
    battery: 45,
    theme: '#e8e6e0',
    messages: [
      '그런 날도 있어요. 조금만 쉬었다 가요.',
      '가라앉는 기분도 자연스러운 거예요. 천천히 가요.',
      '지금 이대로도 괜찮아요. 잠깐 머물러봐요.',
    ],
  },
  {
    id: 'okay',
    emoji: '🙂',
    label: '그럭저럭 괜찮아요',
    battery: 70,
    theme: '#eaeedc',
    messages: [
      '괜찮은 날이네요. 그래도 잠깐 충전해두면 더 좋아요.',
      '지금처럼만 쭉 가봐요. 잠깐의 충전도 도움이 돼요.',
      '나쁘지 않은 하루네요. 조금 더 채워봐요.',
    ],
  },
];

function getStateById(id) {
  return STATES.find((s) => s.id === id) || null;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
