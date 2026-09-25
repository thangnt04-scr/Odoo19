# Hỗ trợ khách hàng

Ứng dụng quản lý phiếu yêu cầu hỗ trợ trên Odoo 19, dùng trong bài tập cho nhân viên mới.

## Chức năng

- Tạo và quản lý phiếu, khách hàng, nhân viên xử lý, kênh tiếp nhận, mức ưu tiên và hạn xử lý.
- Lưu lịch sử trao đổi; mã phiếu được tạo tự động theo dạng `PH-00001`.
- Có bốn trạng thái mặc định: Mới, Đang xử lý, Chờ khách hàng và Đã đóng.
- Phân công một hoặc nhiều phiếu bằng cửa sổ nhập liệu; đóng phiếu từ biểu mẫu.
- Tra cứu thông tin phiếu qua giao thức JSON-RPC, yêu cầu đăng nhập và quyền đọc.

## Đối chiếu yêu cầu kỹ thuật

### Mô hình và trường

- `helpdesk.ticket`: 17 trường. `ticket_ref` (Char, mã tự sinh, duy nhất); `name` (Char, bắt buộc, theo dõi); `active` (Boolean); `partner_id` (Many2one khách hàng); `contact_email` và `contact_phone` (Char liên kết từ khách hàng); `user_id` (Many2one agent); `stage_id` (Many2one, bắt buộc, theo dõi); `stage_is_closed` (Related); `is_overdue` (Boolean Compute); `priority` (Selection, theo dõi); `channel` (Selection, bắt buộc, theo dõi); `description` (Html); `date_deadline` (Date, theo dõi); `closed_date` (Datetime); `company_id` (Many2one, bắt buộc); `resolution_notes` (Text).
- `helpdesk.stage`: `name` (Char, bắt buộc); `sequence` (Integer); `is_closed` và `active` (Boolean).
- Mở rộng `res.partner` bằng `helpdesk_customer` để đăng ký khách hàng; mở rộng `res.users` bằng `helpdesk_agent` để nhận diện thành viên nhóm Helpdesk.
- `is_overdue` dùng `compute` / `@api.depends`, không lưu vì phụ thuộc ngày hiện tại. `@api.onchange` hỗ trợ xem ngày đóng khi đổi trạng thái; `create` / `write` vẫn đồng bộ ngày đóng khi dữ liệu đi từ API hoặc nhập liệu. `@api.constrains` kiểm tra tiêu đề, khách hàng và agent.

### Giao diện và dữ liệu

- Luồng Ticket: `views/helpdesk_ticket_views.xml` khai báo list, form, search; `views/menus.xml` khai báo action và menu.
- Danh sách khách hàng dùng `res.partner`; danh sách nhân viên dùng `res.users`, lọc theo nhóm Helpdesk. Biểu mẫu khách hàng kế thừa `base.view_partner_form` bằng XPath, không sao chép view Odoo.
- Dữ liệu mẫu trạng thái ở `data/helpdesk_stage_data.xml`; mã ticket ở `data/sequence.xml`.
- Chatter và tracking dùng `mail.thread`, `mail.activity.mixin` và `tracking=True`. Chưa có mẫu email hay tự động nhắc SLA vì luồng hiện tại chưa yêu cầu gửi email tự động.

### Phân quyền, bộ điều khiển và cửa sổ nhập liệu

- Quyền CRUD theo mô hình nằm ở `security/ir.model.access.csv`; phạm vi ticket theo công ty và agent/giám sát nằm ở `security/rules.xml`.
- Agent được đọc/tạo/sửa ticket, không xóa; giám sát được quản lý trạng thái; quản trị Helpdesk được toàn quyền trên ticket và trạng thái.
- `controllers/main.py`: `POST /ho-tro/phieu/<ticket_id>/tom-tat`, `type="jsonrpc"`, `auth="user"`; kiểm tra quyền đọc ticket rồi trả mã, tiêu đề, khách hàng và trạng thái.
- `helpdesk.assign.wizard` nhận các ticket đã chọn qua `active_ids` và yêu cầu chọn agent trước khi phân công. `helpdesk.agent.create.wizard` tạo tài khoản nội bộ mới, chỉ dành cho giám sát viên và tự thêm nhóm agent.
- Chưa dùng asset/OWL, cron hoặc automated action vì không có giao diện frontend tùy chỉnh hay SLA tự động trong phạm vi hiện tại.

## Các thao tác ORM cơ bản

- Trường `is_overdue` được tính từ hạn xử lý và trạng thái đóng bằng `compute` / `@api.depends`.
- `is_overdue` không lưu xuống cơ sở dữ liệu vì còn phụ thuộc ngày hiện tại; như vậy giá trị được cập nhật đúng khi sang ngày mới mà không cần cron.
- Khi chọn khách hàng trên biểu mẫu, hệ thống tự điền thư điện tử và số điện thoại.
- `@api.constrains` không cho lưu tiêu đề chỉ có khoảng trắng hoặc gán phiếu cho tài khoản cổng thông tin.
- Tên trạng thái cũng được kiểm tra ở model, nên không thể lưu tên chỉ gồm khoảng trắng.
- Tự điền trên biểu mẫu chỉ hỗ trợ người dùng; dữ liệu nhập qua mã hoặc tệp nhập vẫn được kiểm tra ở mô hình.
- Wizard phân công được giữ lại vì cần người dùng chọn nhân viên xử lý trước khi cập nhật nhiều phiếu.

## Cài đặt

Đặt thư mục `addons` trong đường dẫn tiện ích, tạo cơ sở dữ liệu học tập riêng, rồi chạy:

```bash
python odoo-bin -d helpdesk_demo -i helpdesk --addons-path=addons,odoo/addons --stop-after-init
```

Khi cập nhật mã nguồn:

```bash
python odoo-bin -d helpdesk_demo -u helpdesk --addons-path=addons,odoo/addons --stop-after-init
```

## Demo nhanh

1. Gán nhóm Nhân viên hỗ trợ, Giám sát viên hỗ trợ hoặc Quản trị viên hỗ trợ cho người dùng nội bộ.
2. Mở **Hỗ trợ khách hàng → Phiếu hỗ trợ**, tạo 3–5 phiếu và kiểm tra mã, lịch sử trao đổi, trạng thái, kênh và người xử lý.
3. Chọn một hoặc nhiều phiếu, bấm **Gán nhân viên xử lý** rồi chọn người nhận.
4. Mở phiếu và bấm **Đóng phiếu**; phiếu chuyển sang trạng thái đã đóng và ghi nhận thời điểm đóng.
5. Gửi yêu cầu `POST /ho-tro/phieu/<ticket_id>/tom-tat` bằng phiên đăng nhập Odoo. Nội dung gửi theo định dạng JSON-RPC:

```json
{"jsonrpc":"2.0","method":"call","params":{},"id":1}
```

Kết quả trả về gồm `ma_phieu`, `tieu_de`, `khach_hang` và `trang_thai`. Đường dẫn yêu cầu đăng nhập và kiểm tra quyền đọc phiếu.

Ví dụ kết quả:

```json
{"jsonrpc":"2.0","id":1,"result":{"ma_phieu":"PH-00001","tieu_de":"Không đăng nhập được","khach_hang":"Nguyễn An","trang_thai":"Mới"}}
```

## Phân quyền

- **Nhân viên hỗ trợ:** đọc, tạo và sửa phiếu; không xóa; chỉ đọc trạng thái.
- **Giám sát viên hỗ trợ:** có quyền của nhân viên và được quản lý trạng thái; không xóa trạng thái.
- **Quản trị viên hỗ trợ:** có quyền của giám sát viên và được xóa phiếu, trạng thái.

Quyền theo model nằm trong `security/ir.model.access.csv`; quy tắc theo bản ghi nằm trong `security/rules.xml`:

- Nhân viên thấy phiếu chưa gán hoặc được giao cho mình.
- Giám sát viên và quản trị viên thấy mọi phiếu thuộc công ty họ được phép truy cập.
- Quy tắc công ty áp dụng cho mọi nhóm Helpdesk.

Khi demo, cần đăng nhập bằng từng vai trò để kiểm tra quyền menu, quyền CRUD và phạm vi phiếu nhìn thấy.
