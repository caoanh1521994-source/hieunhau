# Hiểu Con – Hiểu Bố Mẹ · Đảo KioMath 3D

Web game nhập vai 3D (phong cách Play Together) dựng từ phiếu **"Hiểu con – Hiểu bố mẹ"** – 5 phút vui vẻ trước giờ test tại KioMath.
Bố/mẹ và con chơi lần lượt trên cùng một máy, rồi cùng **Đổi phiếu** để xem nhà mình hiểu nhau đến đâu.

## Luồng chơi
1. **Bố/mẹ** tạo nhân vật (họ tên, SĐT, tên con), đi quanh đảo ghé 7 trạm:
   - 4 trạm ♥: Đồi Bài Khó (Cú Mi), Giếng Ước Mong (Thỏ Bông), Lều Ấm Áp (Gấu Bông), Tiệm Quà Bất Ngờ (Mèo Mướp).
     Trạm 1, 3, 4 bố mẹ đoán ý con; trạm 2 bố mẹ trả lời thật.
   - Góc riêng: Đài Quan Sát (tố chất Toán, 6 dấu ✓), Bậc Thang Kì Vọng (điểm đang / mong + biểu đồ khoảng cách).
   - Hòm Thư: lời nhắn gửi con.
2. Màn **chuyển máy** (giữ nút để bắt đầu) → **con** tạo nhân vật (họ tên, lớp), ghé 4 trạm ♥ (câu 2 con đoán ý bố mẹ),
   Sân Chơi Toán (giờ học thích, tối đa 2), Gương Thần (3 từ tả bố/mẹ), Hòm Thư.
3. **Quảng trường Đổi phiếu**: lật 4 thẻ ♥, tính điểm /4 (Tri kỉ / Ăn ý đấy / Bất ngờ chưa), đọc thư của nhau,
   bấm Đập tay – Ôm nhau – Chụp ảnh check-in (ảnh có khung KioMath), cả nhà đặt mục tiêu tháng đầu.
4. **Dành cho KioMath** (có mật khẩu): Hiểu nhau /4 · Tố chất /6 · Điểm đang / mong · Con thích học, bảng các gia đình đã chơi trên máy, sao chép để dán vào Excel.

Điều khiển: cần gạt (điện thoại) hoặc WASD/mũi tên, kéo để xoay camera, Space nhảy, E nói chuyện, 1–4 biểu cảm.
Danh sách nhiệm vụ có nút **Đi tới** để dịch chuyển nhanh (cho bố mẹ chưa quen chơi game).

## Cấu trúc tệp
| Tệp | Nội dung |
|---|---|
| `index.html` | Trang hoàn chỉnh do `build.py` sinh ra – **không sửa tay** |
| `src/data.js` | Câu hỏi, đáp án, lời thoại NPC, vị trí các trạm (lấy từ phiếu) |
| `src/world.js` | Thế giới 3D: đảo, trạm, nhân vật chibi, thú NPC, hiệu ứng (three.js r128 từ cdnjs) |
| `src/app.js` | Luồng chơi, hộp thoại, Đổi phiếu, ảnh check-in, lưu kết quả, mật khẩu giáo viên |
| `src/audio.js` | Nhạc nền + hiệu ứng tổng hợp bằng Web Audio |
| `src/style.css`, `src/app.html`, `src/head.html` | Giao diện |
| `src/logo.b64`, `src/mark.b64` | Logo KioMath (nhúng base64) |
| `apps-script.gs` | Mã Google Apps Script nhận kết quả về Google Sheet |

## Sửa và build
```
python3 build.py      # phải in "JS: OK"
```
Sửa câu chữ trong `src/data.js`, chạy build, commit cả `src/` và `index.html`.

## Mật khẩu "Dành cho KioMath"
Mặc định là `kiomath`. Đổi mật khẩu: tính SHA-256 của chuỗi `hieunhau:<mật khẩu mới>` rồi thay giá trị `STAFF_HASH` trong `src/app.js`:
```
python3 -c "import hashlib;print(hashlib.sha256('hieunhau:MATKHAU'.encode()).hexdigest())"
```

## Nối Google Sheet (tùy chọn)
Làm theo hướng dẫn ở đầu `apps-script.gs`, dán URL `/exec` vào `const SHEET_API = '';` trong `src/app.js`, build lại và đẩy lên.
Chưa nối thì kết quả vẫn lưu trên máy (localStorage) và xem được ở mục Dành cho KioMath.

## Đưa lên Vercel
Add New → Project → Import repo này → Framework Preset **Other**, không Build Command, Output Directory để trống, Project Name = tên repo.
