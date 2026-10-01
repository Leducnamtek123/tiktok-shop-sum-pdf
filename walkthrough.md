# Cập nhật Logistics Pro v3.7: Khắc phục lỗi đọc lộn Combo Flor + Analgin C + Butavit thành Butavital

## 1. Vấn đề thực tế từ đơn hàng ngày 01/10/2026
- **Ảnh đính kèm từ khách hàng**:
  - Gói hàng TikTok Shop: `Combo: Navet-Flor + Navet Analgin C + Navet-Butavit - Trị hô hấp, phổi, ngẹt mũi, gia súc, heo, trâu, bò, dê`
  - Tin nhắn phản hồi:
    - *"e zai"*
    - *"Flor Analgin C Butavit"*
    - *"Nó đọc thành Butavital e ơi"*
    - *"Phieu_Nhat_Hang_TikTok_Shop_2026-10-01.pdf"*
    - *"Đúng hết á, đọc lộn Butavit với Butavital thui"*

## 2. Nguyên nhân cốt lõi (Root Cause)
1. **Lỗi định nghĩa thành phần trong luật Combo `combo_flor_analgin_butavit`**:
   - ID của luật là `combo_flor_analgin_butavit` (đuôi `_butavit`), tuy nhiên trường `components` trước đây bị gán nhầm thành:
     `"1 Navet-Flor (100ml) + 1 Navet-Analgin C (100ml) + 1 NAVET-BUTAVITAL (100ml)"`
   - Nguyên nhân lịch sử: Từ bản v2.9 khi từng có đợt chuẩn hóa gộp Butavit về Butavital. Dù ở v3.2 và v3.5 đã tách bạch Butavit và Butavital cho các combo khác (`combo_azifluxin_analgin_butavit`, `combo_navet_cel_analgin_calcifort_butavit`), combo Flor vẫn còn sót chữ `NAVET-BUTAVITAL` trong `data/combos.json` và `DEFAULT_COMBO_RULES`.
2. **Thiếu cơ chế migrate/normalize cho `combo_flor_analgin_butavit` trong `normalizeRule`**:
   - Nếu client từng lưu bộ luật vào `localStorage` của trình duyệt, nếu không có hàm migration `normalizeRule`, trình duyệt vẫn giữ nguyên luật cũ có `NAVET-BUTAVITAL`.
3. **Trích xuất tên chính khi tiêu đề bắt đầu bằng `Combo:`**:
   - Khi tiêu đề có dạng `Combo: Navet-Flor...` (dấu hai chấm ngay sau chữ Combo), lệnh `split(/:|\s-\s/)` cũ lấy `parts[0]` là chữ `"combo"`, làm mất đi điểm ưu tiên (+200 điểm) cho tên chính.

## 3. Các điểm đã khắc phục triệt để trên Logistics Pro v3.7
1. **Sửa dứt điểm thành phần và từ khóa combo trong `data/combos.json` & `DEFAULT_COMBO_RULES`**:
   - `name`: `"Combo Navet-Flor + Navet Analgin C + Navet-Butavit (Hô hấp phức hợp)"`
   - `productKeyword`: `"Navet-Flor + Navet Analgin, Navet-Flor + Analgin C, Flor + Analgin + Butavit, Flor + Butavit"`
   - `components`: `"1 Navet-Flor (100ml) + 1 Navet-Analgin C (100ml) + 1 NAVET-BUTAVIT (100ml)"` (chính xác 100% là `NAVET-BUTAVIT`).
2. **Thêm cơ chế tự động sửa lỗi bộ nhớ đệm trong `normalizeRule(r)`**:
   - Mọi bản ghi cũ trong `localStorage` hay API khi nạp qua `normalizeRule` đều tự động cập nhật về `NAVET-BUTAVIT`.
3. **Cải tiến bộ trích xuất `primaryNorm`**:
   - Tự động bỏ tiền tố `^(?:combo|bo san pham|cap doi|bo doi)\s*[:\-]\s*` trước khi phân tách tên chính, đảm bảo cụm `navet-flor+navet analgin c+navet-butavit` được cộng đủ +200 điểm ưu tiên.
4. **Bổ sung Scoring Booster chuyên biệt cho `combo_flor_analgin_butavit`**:
   - Nhận diện tức thì tổ hợp thuốc `flor` + `butavit` / `analgin` với điểm cộng +120.
5. **Chuẩn hóa chữ hoa `NAVET-FLOR` trong `parseComboComponents`**.
6. **Nâng cấp version giao diện lên `Logistics Pro v3.7`**.

## 4. Kiểm thử & Triển khai
- Chạy test suite `scratch/test_flor_butavit.js` kiểm tra toàn bộ 7 kịch bản combo, đảm bảo khớp chính xác 100% `NAVET-BUTAVIT`, không để lọt `NAVET-BUTAVITAL`, và không gây ảnh hưởng (no regression) đến các combo khác.
- Đã deploy bản mới nhất lên VPS `76.13.211.166` (dịch vụ `tiktok-tools-api.service` đang active, kiểm tra curl API trả về đúng Butavit).
- Website hoạt động tại: [https://tiktok-tools.nodelee.tech](https://tiktok-tools.nodelee.tech)

---

# Cập nhật Logistics Pro v3.6: Khắc phục lỗi đọc lẫn Combo Heo Nái và Combo Navet-Cel
...
