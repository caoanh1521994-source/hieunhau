/**
 * HIỂU CON – HIỂU BỐ MẸ · Nhận kết quả từ web game về Google Sheet
 * 1. Tạo Google Sheet → Tiện ích mở rộng → Apps Script, dán toàn bộ code này, bấm Lưu.
 * 2. Triển khai → Tùy chọn triển khai mới → Ứng dụng web; Thực thi: Tôi; Truy cập: Bất kỳ ai
 *    → sao chép URL đuôi /exec.
 * 3. Dán URL vào dòng `const SHEET_API = '';` trong src/app.js, chạy `python3 build.py`, đẩy lại GitHub.
 * 4. Sửa code sau này: Quản lý bản triển khai → Chỉnh sửa → Phiên bản: Mới (giữ nguyên URL).
 * Lưu ý: bảng có số điện thoại phụ huynh, chỉ chia sẻ Sheet cho người của trung tâm.
 */
const SHEET = 'KetQua';
const HEAD = ['id', 'Thời gian', 'Bố/Mẹ', 'Họ tên PH', 'SĐT', 'Con', 'Lớp', 'Hiểu nhau /4', 'Tố chất /6', 'Tố chất đã tích',
  'Điểm đang', 'Điểm mong', 'Con thích học', 'Ba từ tả bố/mẹ', 'Mục tiêu tháng', 'Đáp án PH', 'Đáp án con', 'Lời nhắn PH', 'Lời nhắn con', 'Đã làm', 'Nhận lúc'];
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); let s = ss.getSheetByName(SHEET);
  if (!s) { s = ss.insertSheet(SHEET); s.appendRow(HEAD); s.setFrozenRows(1); s.getRange(1, 1, 1, HEAD.length).setFontWeight('bold'); }
  return s;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return json_({ ok: true, rows: Math.max(0, sheet_().getLastRow() - 1) }); }
function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents); if (!d.id) return json_({ ok: false });
    const c = (v, n) => String(v == null ? '' : v).slice(0, n || 80), num = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));
    const row = [c(d.id), c(d.time), c(d.role, 4), c(d.pname), "'" + c(d.phone, 16), c(d.child), c(d.cls, 12), num(d.hieu, 4), num(d.tocchat, 6), c(d.traits, 400),
      c(d.now, 2), c(d.want, 2), c(d.likes, 200), c(d.words, 100), c(d.goal, 200), c(d.ansP, 4), c(d.ansC, 4), c(d.msgP, 300), c(d.msgC, 300), c(d.acts, 40), new Date()];
    const sh = sheet_(), ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => String(r[0])), at = ids.indexOf(row[0]);
    if (at > 0) sh.getRange(at + 1, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
    return json_({ ok: true });
  } finally { lock.releaseLock(); }
}
