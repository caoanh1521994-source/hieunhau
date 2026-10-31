# CLAUDE.md – Hiểu Con – Hiểu Bố Mẹ (Đảo KioMath 3D)

- Kiểu B: nguồn trong `src/`, `python3 build.py` ghép thành `index.html` (Vercel) và `preview.html` (bản xem trước dạng mảnh). Không sửa tay `index.html`. Build phải in `JS: OK`.
- three.js **r128** từ cdnjs (UMD, global `THREE`). r128 không có CapsuleGeometry; MeshToonMaterial không có `flatShading`; `GRAD` phải là RGBAFormat (shader toon đọc `.rgb`).
- Nội dung lấy nguyên từ phiếu "Hiểu con – Hiểu bố mẹ" (`src/data.js`). Không đổi đáp án/ý nghĩa câu hỏi; `{P}` = Bố/Mẹ, `{p}` = bố/mẹ, `{C}` = tên gọi của con (từ cuối họ tên).
- Khóa câu hỏi `q1..q4`, `tc`, `kv`, `hoc`, `guong`, `thu` và cấu trúc `S.ans` đừng đổi (localStorage `hieunhau-v1:session`, lịch sử `hieunhau-v1:history`). Đổi cấu trúc thì viết đoạn chuyển dữ liệu cũ.
- Góc riêng của bố mẹ (`tc`, `kv`) không bao giờ hiện ở lượt con hay màn Đổi phiếu; chỉ hiện ở "Dành cho KioMath" (mật khẩu, SHA-256 trong `STAFF_HASH`, không ghi mật khẩu dạng chữ).
- Trạm đặt quanh quảng trường, nhóm quay mặt vào tâm (`sGroup`); vật cản là các hình tròn trong `COLL`. Cột đèn chỉ ở nửa phía bắc để không che sân khấu Đổi phiếu (z = 4.2).
- Kiểm tra bằng Playwright ở 1200px và 390px (chặn cdnjs/Google Fonts thì route sang bản cục bộ), chạy hết luồng p → c → Đổi phiếu → KioMath, không có `pageerror`.
