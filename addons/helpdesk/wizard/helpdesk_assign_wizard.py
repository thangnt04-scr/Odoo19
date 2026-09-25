from odoo import _, fields, models
from odoo.exceptions import UserError


class HelpdeskAssignWizard(models.TransientModel):
    _name = "helpdesk.assign.wizard"
    _description = "Gán nhân viên xử lý ticket hỗ trợ"

    user_id = fields.Many2one(
        "res.users",
        string="Nhân viên xử lý",
        required=True,
        domain=[("helpdesk_agent", "=", True), ("share", "=", False)],
    )

    def action_assign(self):
        self.ensure_one()
        active_ids = self.env.context.get("active_ids", [])
        if self.env.context.get("active_model") != "helpdesk.ticket" or not active_ids:
            raise UserError(_("Hãy chọn ít nhất một ticket cần phân công."))
        tickets = self.env["helpdesk.ticket"].browse(active_ids).exists()
        if not tickets:
            raise UserError(_("Không tìm thấy ticket cần phân công."))
        tickets.write({"user_id": self.user_id.id})
        return {"type": "ir.actions.act_window_close"}
