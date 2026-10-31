// ====== NỘI DUNG LẤY TỪ PHIẾU "HIỂU CON – HIỂU BỐ MẸ" ======
// {P} = Bố/Mẹ (viết hoa), {p} = bố/mẹ (viết thường), {C} = tên con.
// truth: ai trả lời thật lòng ('c' = con, 'p' = bố mẹ); người còn lại đoán.

const HQ = {
  q1: {
    n: 1, truth: 'c',
    opts: ['Cố nghĩ tiếp đến khi ra', 'Hỏi ngay bố mẹ, thầy cô', 'Để đó, làm bài khác trước', 'Thấy nản, muốn bỏ qua'],
    pq: 'Gặp một bài Toán khó, con thường...', ph: '{P} đoán xem {C} sẽ chọn gì',
    cq: 'Gặp một bài Toán khó, em thường...', ch: 'Em chọn thật lòng nhé',
    rq: 'Gặp một bài Toán khó, con thường...',
    pSay: 'Chào {P}! Đồi này toàn bài Toán khó. {P} thử đoán xem: gặp bài khó, {C} thường làm gì?',
    cSay: 'Chào {C}! Đồi này đầy bài Toán khó. Gặp bài khó thì em hay làm gì? Nói thật nha, Cú không mách ai đâu!',
    done: 'Cú Mi cất câu trả lời vào hộp bí mật rồi. Đến giờ Đổi phiếu mới được mở!',
    hit: '{P} hiểu cách con học rồi đấy!',
    miss: '{C} kể cho {p} nghe: lần gần nhất gặp bài khó, con đã làm gì?'
  },
  q2: {
    n: 2, truth: 'p',
    opts: ['Điểm cao, đứng top lớp', 'Thích Toán, thấy học vui', 'Tự tin, không sợ bài khó', 'Đỗ trường chuyên, đạt giải'],
    pq: 'Điều {p} mong nhất ở con với môn Toán là...', ph: '{P} trả lời thật, {C} sẽ đoán ý {p}',
    cq: '{P} mong em điều gì nhất ở môn Toán?', ch: 'Em thử đoán ý {p} xem!',
    rq: 'Điều {p} mong nhất ở con với môn Toán là...',
    pSay: 'Giếng Ước Mong nghe được điều thật lòng nhất. {P} mong gì nhất ở {C} với môn Toán?',
    cSay: '{C} ơi, {p} vừa thả một điều ước xuống giếng. Em đoán xem {p} mong em điều gì nhất?',
    done: 'Điều ước đã chìm xuống đáy giếng. Bí mật nhé!',
    hit: '{C} hiểu đúng mong muốn của {p}!',
    miss: '{P} kể cho {C} nghe vì sao {p} mong điều đó nhất nhé.'
  },
  q3: {
    n: 3, truth: 'c',
    opts: ['Ôm một cái thật chặt', 'Ngồi xem lại bài cùng', 'Để con yên một lúc', 'Nói "Không sao, lần sau cố"'],
    pq: 'Khi bị điểm chưa tốt, con mong {p} làm gì nhất?', ph: '{P} đoán xem {C} sẽ chọn gì',
    cq: 'Khi bị điểm chưa tốt, em mong {p} làm gì nhất?', ch: 'Em chọn thật lòng nhé',
    rq: 'Khi bị điểm chưa tốt, con mong {p} làm gì nhất?',
    pSay: 'Lều Ấm Áp là chỗ trú những hôm điểm chưa tốt. Lúc ấy, {P} nghĩ {C} mong {p} làm gì nhất?',
    cSay: 'Vào lều ngồi đi {C}. Hôm nào bị điểm chưa tốt, em mong {p} làm gì cho em nhất?',
    done: 'Gấu Bông ôm câu trả lời thật chặt, không cho ai xem trước đâu!',
    hit: 'Đúng điều con cần. {P} giỏi quá!',
    miss: 'Lần tới con bị điểm chưa tốt, {p} thử làm đúng điều con chọn nhé.'
  },
  q4: {
    n: 4, truth: 'c',
    opts: ['Được khen trước cả nhà', 'Đi ăn món mình thích', 'Thêm giờ chơi, xem TV', 'Một món quà nhỏ bất ngờ'],
    pq: 'Phần thưởng con thích nhất khi làm tốt bài?', ph: '{P} đoán xem {C} sẽ chọn gì',
    cq: 'Phần thưởng em thích nhất khi làm tốt bài?', ch: 'Em chọn thật lòng nhé',
    rq: 'Phần thưởng con thích nhất khi làm tốt bài?',
    pSay: 'Chào mừng tới Tiệm Quà Bất Ngờ! {P} đoán xem {C} thích phần thưởng nào nhất khi làm tốt bài?',
    cSay: 'Meo! {C} làm bài tốt thì muốn được thưởng gì nhất? Chọn thật lòng nha!',
    done: 'Mèo Mướp gói câu trả lời vào hộp quà rồi. Giờ Đổi phiếu mới mở!',
    hit: 'Phần thưởng chuẩn từng li. Nhớ thực hiện nha!',
    miss: 'Ghi nhớ phần thưởng con thích để dành cho lần làm tốt tới nha!'
  }
};

// Góc riêng của bố mẹ · 1
const TRAITS = [
  'Tự phát hiện quy luật mà không cần gợi ý',
  'Thích bài khó, kiên trì nghĩ lâu mà không bỏ cuộc',
  'Giải thích được "vì sao", không chỉ "làm thế nào"',
  'Tìm được hơn một cách giải cho một bài',
  'Làm được bài lạ, không chỉ bài giống mẫu',
  'Đọc đề nắm ý nhanh, tính nhẩm linh hoạt'
];
const TRAIT_TIERS = [
  { min: 5, max: 6, k: '5 – 6', t: 'Nên được đánh giá để vào lộ trình bồi dưỡng chuyên sâu' },
  { min: 3, max: 4, k: '3 – 4', t: 'Học tư duy nâng cao, tiếp tục quan sát thêm' },
  { min: 0, max: 2, k: '0 – 2', t: 'Củng cố nền vững trước: chưa đến lúc, không phải "kém"' }
];
// Góc riêng của bố mẹ · 2
const NEEDS = [
  ['Động lực của con', 'Con muốn học thì mới học được lâu. Khen nỗ lực, không chỉ khen điểm.'],
  ['Kì vọng vừa tầm', 'Vừa sức con, cộng thêm một chút cố gắng.'],
  ['Mục tiêu rõ ràng', 'Cụ thể, vừa sức, đo được theo từng tháng.']
];
// Phần của con · câu 5 (tối đa 2)
const LIKES = ['Trò chơi, thi đấu theo đội', 'Câu đố hóc búa để nghĩ', 'Thầy cô giảng chậm, kĩ', 'Đo đạc, mua bán, đồ vật thật'];

const WORD_IDEAS = ['hiền', 'vui tính', 'ấm áp', 'chăm chỉ', 'hài hước', 'nghiêm khắc', 'kiên nhẫn', 'xinh đẹp', 'bận rộn', 'thông minh', 'nấu ăn ngon', 'hay lo'];
const MSG_P = ['{P} luôn tự hào về con.', 'Cứ bình tĩnh làm bài nhé!', 'Dù điểm thế nào, {p} vẫn thương con.', 'Cảm ơn con đã cố gắng mỗi ngày.'];
const MSG_C = ['Con thương {p} nhiều!', 'Con sẽ cố gắng hết sức.', '{P} đừng lo nha!', 'Cảm ơn {p} đã đưa con đi học.'];

const TIERS = [
  { min: 4, t: 'Tri kỉ!', d: 'Nhìn nhau là hiểu. Đập tay một cái nào!' },
  { min: 2, t: 'Ăn ý đấy!', d: 'Còn vài bất ngờ để khám phá thêm.' },
  { min: 0, t: 'Bất ngờ chưa!', d: 'Tối nay cả nhà có chuyện để kể rồi.' }
];

// ====== CÁC TRẠM TRÊN ĐẢO ======
// who: 'both' = cả hai lượt, 'p' = chỉ bố mẹ, 'c' = chỉ con
const STATIONS = [
  { id: 'q1', who: 'both', x: -16, z: -16, name: 'Đồi Bài Khó', npc: 'Cú Mi', emo: '🦉', col: '#8a6bd1', act: 'Nói chuyện với Cú Mi' },
  { id: 'q2', who: 'both', x: 0, z: -23, name: 'Giếng Ước Mong', npc: 'Thỏ Bông', emo: '🐰', col: '#4cb4e6', act: 'Ghé Giếng Ước Mong' },
  { id: 'q3', who: 'both', x: 16, z: -16, name: 'Lều Ấm Áp', npc: 'Gấu Bông', emo: '🐻', col: '#e98a4a', act: 'Vào Lều Ấm Áp' },
  { id: 'q4', who: 'both', x: 23, z: 1, name: 'Tiệm Quà Bất Ngờ', npc: 'Mèo Mướp', emo: '🐱', col: '#f06292', act: 'Ghé Tiệm Quà' },
  { id: 'tc', who: 'p', x: -23, z: 2, name: 'Đài Quan Sát', npc: 'Đài Quan Sát', emo: '🔭', col: '#6b5bd6', act: 'Lên Đài Quan Sát' },
  { id: 'kv', who: 'p', x: -14, z: 19, name: 'Bậc Thang Kì Vọng', npc: 'Bậc Thang Kì Vọng', emo: '⭐', col: '#e0663c', act: 'Xem Bậc Thang Kì Vọng' },
  { id: 'hoc', who: 'c', x: 15, z: 18, name: 'Sân Chơi Toán', npc: 'Sóc Nâu', emo: '🐿️', col: '#3cb88f', act: 'Chơi với Sóc Nâu' },
  { id: 'guong', who: 'c', x: -2, z: 24, name: 'Gương Thần', npc: 'Gương Thần', emo: '✨', col: '#b07be0', act: 'Soi Gương Thần' },
  { id: 'thu', who: 'both', x: 6, z: 10.5, name: 'Hòm Thư', npc: 'Hòm Thư', emo: '📮', col: '#e5484d', act: 'Viết thư' }
];
