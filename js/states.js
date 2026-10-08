const STATES = [
  {
    id: 'heavy',
    emoji: '😮‍💨',
    label: '오늘 좀 버거워요',
    battery: 15,
    message: '많이 힘드셨겠어요. 지금은 그냥 숨 고르는 것만으로도 충분해요.',
  },
  {
    id: 'blank',
    emoji: '😶',
    label: '머리가 멍해요',
    battery: 30,
    message: '생각을 잠깐 꺼둬도 괜찮아요. 천천히 돌아오면 돼요.',
  },
  {
    id: 'sharp',
    emoji: '😤',
    label: '괜히 날카로워요',
    battery: 35,
    message: '예민해질 수 있는 날이에요. 잠깐 거리를 두는 것도 좋아요.',
  },
  {
    id: 'tired',
    emoji: '😪',
    label: '그냥 피곤해요',
    battery: 40,
    message: '애쓰지 않아도 돼요. 잠깐 멈춰가도 괜찮아요.',
  },
  {
    id: 'down',
    emoji: '🌥️',
    label: '기분이 가라앉아요',
    battery: 45,
    message: '그런 날도 있어요. 조금만 쉬었다 가요.',
  },
  {
    id: 'okay',
    emoji: '🙂',
    label: '그럭저럭 괜찮아요',
    battery: 70,
    message: '괜찮은 날이네요. 그래도 잠깐 충전해두면 더 좋아요.',
  },
];

function getStateById(id) {
  return STATES.find((s) => s.id === id) || null;
}
