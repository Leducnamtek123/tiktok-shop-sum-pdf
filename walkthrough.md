# Cập nhật Logistics Pro v3.9: Tách biệt tuyệt đối quy cách XÔ vs GÓI (Khắc phục lỗi nhảy số lượng 4 Xô Vitamino)

## 1. Vấn đề thực tế từ phản hồi khách hàng (09/10/2026)
- **Ảnh đính kèm tin nhắn**:
  - *"2 file sáng nay có 1 xô Vitamino à e"*
  - *"Mà tool nó nhảy ra 4 xô"*
- **Bằng chứng trên 2 file Picking List**:
  - `10-09_08-00-18_Picking list_1.pdf` (Trang 6, dòng 49):
    - Đơn `586476989596927298`: `NAVET-VITAMINO`, SKU: `Xô 10 gói 1kg`, Số lượng: **1**.
    - Trang 1, dòng 2: `COMBO SẢN PHẨM VỖ BÉO _ Navet-BioGlucan + Vitamino`, Số lượng: **1** (chứa 1 gói Vitamino 1kg).
  - `10-09_08-00-29_Picking list_2.pdf` (Trang 1, dòng 1):
    - Đơn `586480120816764250` & `586480618713810541`: `COMBO SẢN PHẨM VỖ BÉO`, Số lượng: **2** (chứa 2 gói Vitamino 1kg).
  - Trang 2, dòng 16: `NAVET-VITAMINO`, SKU: `Gói 1kg`, Số lượng: **6**.
- **Hiện tượng**:
  - Tool gom 3 gói Vitamino (1kg) từ combo `SẢN PHẨM VỖ BÉO` vào dòng `Xô 10 gói 1kg`!
  - 1 xô gốc + 3 gói từ combo = **4 Xô**!

## 2. Nguyên nhân cốt lõi (Root Cause)
1. **Quy cách `Xô` chưa được nhận diện là bao bì nguyên khối (Bulk container)**:
   - Trong `parseSkuPackagingType`, tool mới chỉ hỗ trợ `thùng`, `hộp`, `cặp`, `lô`, chưa có regex cho `xô` (`Xô 10 gói 1kg`).
2. **Lỗi lọt chuỗi trong `matchSkuVariant`**:
   - `compSku` của combo là `'1kg'`.
   - `candSku` là `'Xô 10 gói 1kg'`.
   - Khi so sánh chuỗi: `'xô10gói1kg'.includes('1kg')` trả về `true`!
   - Không có kiểm tra tương thích từ khóa `xô` và `thùng`.
3. **Lỗi trừ điểm thay vì loại bỏ trong `findMatchingTargetCandidate`**:
   - Trước đây khi SKU không khớp, tool chỉ trừ 50 điểm (`nameScore -= 50`).
   - Tên sản phẩm khớp 100 điểm, trừ 50 điểm còn 50 điểm (vẫn $\ge 40$), khiến ứng viên sai lệch SKU vẫn bị nhận làm `matchCand`!

## 3. Các điểm đã khắc phục triệt để trên Logistics Pro v3.9
1. **Bổ sung nhận diện quy cách `Xô` trong `parseSkuPackagingType`**:
   - Phân biệt chính xác giữa Xô đóng gói lẻ (`Xô 5kg`, `Xô 10kg`) và Xô đóng gói buôn nhiều món (`Xô 10 gói 1kg` $\rightarrow$ `isBulk: true, packSize: 10`).
2. **Khóa chặn container type `Xô` và `Thùng` trong `matchSkuVariant`**:
   - `isCompXo !== isCandXo` $\rightarrow$ `return false;` (Sản phẩm gói/lẻ tuyệt đối không bao giờ khớp với Xô).
   - `isCompThung !== isCandThung` $\rightarrow$ `return false;` (Sản phẩm lẻ tuyệt đối không ghép vào Thùng).
   - Bổ sung rào chắn xung đột `xô` với `gói`, `chai`, `can`, `hộp`, `ống`.
   - Bổ sung kiểm tra xung đột trọng lượng: `1kg` vs `5kg`, `10kg`, `500g`, `250g`.
3. **Loại bỏ dứt điểm ứng viên sai lệch SKU trong `findMatchingTargetCandidate`**:
   - Nếu `compSku` có chỉ định quy cách (ví dụ `1kg`) mà `cand.sku` không khớp (`!isSkuMatch`), lập tức `continue`, tuyệt đối không gán `matchCand` sai quy cách.
4. **Nâng cấp badge giao diện lên `Logistics Pro v3.9`**.

## 4. Kiểm thử & Triển khai
- Chạy toàn bộ các bộ test tự động:
  - `scratch/test_xo_vitamino.js`: Case có cả Xô và Gói $\rightarrow$ Vitamino combo khớp vào `Gói 1kg` (tổng 9 gói), Xô giữ nguyên 1 xô. Case chỉ có Xô $\rightarrow$ tự động tách dòng mới `Gói 1kg`.
  - `scratch/test_eval_index_html.js`: 100% test cases pass trực tiếp trên logic `index.html`.
  - `scratch/test_full_combos_regression.js`: Tất cả 48 combo rules và kiểm thử biến thể pass 100%.
  - `scratch/test_flor_butavit.js`, `scratch/test_vitamino_lite.js`, `scratch/test_e2e_pdf.js`: Tất cả pass không có regression.
- Đã deploy bản v3.9 lên VPS `76.13.211.166` qua SSH/SFTP, restart service `tiktok-tools-api.service` (trạng thái `active`).
- Đã commit và push code lên GitHub `origin/main`.
- Live site: [https://tiktok-tools.nodelee.tech](https://tiktok-tools.nodelee.tech) (badge v3.9).

---

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
