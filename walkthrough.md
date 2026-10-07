# Cập nhật Logistics Pro v3.8: Tách biệt tuyệt đối dòng sản phẩm LITE (Vitamino vs Vitamino LITE)

## 1. Vấn đề thực tế từ phản hồi khách hàng (07/10/2026)
- **Ảnh đính kèm tin nhắn**:
  - *"Combo vỗ béo: Bioglucan với Vitamino mọi hôm đang đúng, nay nhảy qua Vitamino Lite"*
  - *"Dạ"*
  - *"Cái vỗ béo Lite mới là Vitamino Lite á a"*
- **Bằng chứng trên phiếu nhặt hàng (Picking List dòng 34)**:
  - Dòng 34 hiển thị: `NAVET-VITAMINO LITE : bổ sung vitamin và acid amin...` (Gói 1Kg, Số lượng: 15).
  - Chi tiết gộp đơn gồm:
    - `+ Đã gồm +3 từ: SẢN PHẨM VỖ BÉO + Navet-BioGlucan + Vitamino` (Vitamino thường, 3 gói)
    - `+ Đã gồm +3 từ: Vỗ Béo B (Betazyme + Vitamino)` (Vitamino thường, 3 gói)
    - `+ Đã gồm +7 từ: VỖ BÉO LITE + Navet BETAZYME + Vitamino LITE` (Vitamino LITE, 7 gói)
    - Tổng: 3 + 3 + 7 = 15 gói, tất cả bị gom vào `NAVET-VITAMINO LITE`. Sản phẩm `NAVET-VITAMINO` (thường) biến mất khỏi danh sách nhặt hàng!

## 2. Nguyên nhân cốt lõi (Root Cause)
1. **Tại sao mọi hôm đúng, hôm nay lại bị nhảy sang Vitamino LITE?**:
   - Mọi hôm, trong lô đơn hàng xuất ra PDF **chỉ có combo vỗ béo thường** (hoặc nếu có sản phẩm lẻ `NAVET-VITAMINO` thường). Khi không có ứng viên nào mang tên `NAVET-VITAMINO LITE` trong PDF, thuật toán không tìm thấy ứng viên sai nên nó tự động tạo dòng mới `NAVET-VITAMINO` chuẩn xác.
   - Hôm nay, trong cùng 1 đợt xuất PDF xuất hiện cả 2 dòng: combo vỗ béo thường (6 gói Vitamino thường) VÀ combo vỗ béo LITE (7 gói Vitamino LITE).
2. **Lỗi trong bộ lọc ứng viên `findMatchingTargetCandidate`**:
   - Khi bóc tách thành phần `Vitamino` thường từ combo `SẢN PHẨM VỖ BÉO` và `Vỗ Béo B`, hàm tìm kiếm ứng viên tương đồng trong PDF.
   - Trong PDF có sẵn ứng viên `NAVET-VITAMINO LITE`.
   - Trước đây, `criticalDosages` chỉ kiểm tra `['200', '50%']`. Từ khóa `lite` không nằm trong danh sách hàm lượng/biến thể xung đột.
   - Do đó, từ khóa `vitamino` khớp 100% từ đơn, điểm số vượt ngưỡng và nuốt chửng thành phần `Vitamino` thường vào ứng viên `NAVET-VITAMINO LITE`!

## 3. Các điểm đã khắc phục triệt để trên Logistics Pro v3.8
1. **Khóa chặn tương thích nghiêm ngặt biến thể LITE và PLUS trong `findMatchingTargetCandidate`**:
   - Bổ sung rào chắn logic cứng:
     ```javascript
     const isCompLite = /\blite\b/i.test(compName);
     const isCandLite = /\blite\b/i.test(candPName);
     if (isCompLite !== isCandLite) continue; // Tuyệt đối không ghép sản phẩm thường với bản LITE

     const isCompPlus = /\bplus\b/i.test(compName);
     const isCandPlus = /\bplus\b/i.test(candPName);
     if (isCompPlus !== isCandPlus) continue; // Tuyệt đối không ghép sản phẩm thường với bản PLUS
     ```
   - Mở rộng tập từ khóa dosage/variant xung đột: `criticalDosages = ['200', '50%', '100', 'lite', 'plus', 'pro', 'la']`.
2. **Chuẩn hóa chữ hoa trong `parseComboComponents`**:
   - Tự động chuẩn hóa phân biệt rõ ràng: `NAVET-VITAMINO LITE`, `NAVET-VITAMINO`, `NAVET-BIOGLUCAN`, `NAVET BETAZYME`.
3. **Bảo vệ tra cứu ảnh sản phẩm trong `findProductImageFuzzy`**:
   - Đặt chặn phân biệt `isKeyLite !== isSearchLite` cho cả 3 vòng lặp tra cứu ảnh catalog (`Vitamino`, `Betazyme`, `E-Selen`), tránh việc Vitamino thường hiển thị nhầm ảnh gói Vitamino Lite hoặc ngược lại.
4. **Nâng cấp badge giao diện lên `Logistics Pro v3.8`**.

## 4. Kiểm thử & Triển khai
- Chạy test suite `scratch/test_vitamino_lite.js`:
  - `NAVET-VITAMINO` tách biệt độc lập: 6 gói.
  - `NAVET-VITAMINO LITE` tách biệt độc lập: 7 gói.
  - 100% test cases pass.
- Chạy regression test `scratch/test_flor_butavit.js`: 7/7 suites pass không có xung đột.
- Đã deploy bản v3.8 lên VPS `76.13.211.166`, restart service `tiktok-tools-api.service`.
- Live site: [https://tiktok-tools.nodelee.tech](https://tiktok-tools.nodelee.tech) (đã verify badge v3.8).

---

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
