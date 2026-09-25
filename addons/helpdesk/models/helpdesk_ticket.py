from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError


class HelpdeskTicket(models.Model):
    _name = "helpdesk.ticket"
    _description = "Ticket hỗ trợ"
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _order = "create_date desc, id desc"
    _check_company_auto = True

    _ticket_ref_unique = models.Constraint(
        "unique(ticket_ref)",
        "Mã ticket là duy nhất.",
    )

    ticket_ref = fields.Char(
        string="Mã ticket",
        required=True,
        readonly=True,
        copy=False,
        default="Mới",
        index=True,
    )
    name = fields.Char(string="Tiêu đề", required=True, tracking=True, index=True)
    active = fields.Boolean(string="Đang hoạt động", default=True)
    partner_id = fields.Many2one(
        "res.partner",
        string="Khách hàng",
        domain=[("helpdesk_customer", "=", True)],
        ondelete="set null",
        tracking=True,
    )
    contact_email = fields.Char(
        string="Mail liên hệ",
        related="partner_id.email",
        readonly=True,
    )
    contact_phone = fields.Char(
        string="Số điện thoại liên hệ",
        related="partner_id.phone",
        readonly=True,
    )
    user_id = fields.Many2one(
        "res.users",
        string="Nhân viên xử lý",
        domain=[("helpdesk_agent", "=", True), ("share", "=", False)],
        ondelete="set null",
        tracking=True,
    )
    stage_id = fields.Many2one(
        "helpdesk.stage",
        string="Trạng thái",
        required=True,
        default=lambda self: self.env.ref(
            "helpdesk.stage_new", raise_if_not_found=False
        ),
        ondelete="restrict",
        tracking=True,
        index=True,
    )
    stage_is_closed = fields.Boolean(string="Đã kết thúc", related="stage_id.is_closed")
    is_overdue = fields.Boolean(
        string="Quá hạn",
        compute="_compute_is_overdue",
    )
    priority = fields.Selection(
        [
            ("0", "Thấp"),
            ("1", "Bình thường"),
            ("2", "Cao"),
            ("3", "Khẩn cấp"),
        ],
        string="Mức độ ưu tiên",
        default="1",
        tracking=True,
        index=True,
    )
    channel = fields.Selection(
        [
            ("phone", "Điện thoại"),
            ("email", "Thư điện tử"),
            ("chat", "Trò chuyện trực tuyến"),
            ("other", "Khác"),
        ],
        string="Kênh tiếp nhận",
        required=True,
        default="phone",
        tracking=True,
    )
    description = fields.Html(string="Mô tả")
    date_deadline = fields.Date(string="Hạn xử lý", tracking=True)
    closed_date = fields.Datetime(string="Thời điểm đóng", readonly=True, copy=False)
    company_id = fields.Many2one(
        "res.company",
        string="Công ty",
        required=True,
        default=lambda self: self.env.company,
        index=True,
    )
    resolution_notes = fields.Text(string="Ghi chú xử lý")

    @api.depends("date_deadline", "stage_id.is_closed")
    def _compute_is_overdue(self):
        today = fields.Date.context_today(self)
        for ticket in self:
            ticket.is_overdue = bool(
                ticket.date_deadline
                and ticket.date_deadline < today
                and not ticket.stage_id.is_closed
            )

    @api.onchange("stage_id")
    def _onchange_stage_id(self):
        if self.stage_id.is_closed:
            self.closed_date = fields.Datetime.now()
        else:
            self.closed_date = False

    @api.constrains("name")
    def _check_name_not_blank(self):
        for ticket in self:
            if not ticket.name or not ticket.name.strip():
                raise ValidationError(_("Tiêu đề ticket hỗ trợ không được để trống."))

    @api.constrains("partner_id")
    def _check_partner_is_helpdesk_customer(self):
        for ticket in self:
            if ticket.partner_id and not ticket.partner_id.helpdesk_customer:
                raise ValidationError(_("Chỉ có thể chọn khách hàng đã đăng ký Helpdesk."))

    @api.constrains("user_id")
    def _check_assigned_agent_is_internal(self):
        for ticket in self:
            if ticket.user_id and (ticket.user_id.share or not ticket.user_id.helpdesk_agent):
                raise ValidationError(_("Chỉ có thể gán ticket cho nhân viên thuộc nhóm Helpdesk."))

    @api.model_create_multi
    def create(self, vals_list):
        values_list = [dict(values) for values in vals_list]
        for values in values_list:
            if not values.get("ticket_ref") or values.get("ticket_ref") == "Mới":
                values["ticket_ref"] = (
                    self.env["ir.sequence"].next_by_code("helpdesk.ticket")
                    or _("Mới")
                )
        tickets = super().create(values_list)
        tickets.filtered(lambda ticket: ticket.stage_id.is_closed and not ticket.closed_date).write(
            {"closed_date": fields.Datetime.now()}
        )
        return tickets

    def write(self, vals):
        values = dict(vals)
        if "stage_id" in values:
            stage = self.env["helpdesk.stage"].browse(values["stage_id"])
            values["closed_date"] = fields.Datetime.now() if stage.is_closed else False
        return super().write(values)

    def action_open_assign_wizard(self):
        return {
            "type": "ir.actions.act_window",
            "name": _("Gán nhân viên xử lý"),
            "res_model": "helpdesk.assign.wizard",
            "view_mode": "form",
            "target": "new",
            "context": dict(
                self.env.context,
                active_model=self._name,
                active_ids=self.ids,
            ),
        }

    def action_close_ticket(self):
        self.ensure_one()
        closing_stage = self.env["helpdesk.stage"].search(
            [("is_closed", "=", True)], order="sequence, id", limit=1
        )
        if not closing_stage:
            raise UserError(_("Hãy cấu hình trạng thái kết thúc trước khi đóng ticket."))
        self.write(
            {
                "stage_id": closing_stage.id,
            }
        )
