from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class HelpdeskStage(models.Model):
    _name = "helpdesk.stage"
    _description = "Trạng thái ticket"
    _order = "sequence, id"

    name = fields.Char(string="Tên trạng thái", required=True, translate=True)
    sequence = fields.Integer(string="Thứ tự", default=10)
    is_closed = fields.Boolean(string="Trạng thái kết thúc")
    active = fields.Boolean(string="Đang hoạt động", default=True)

    @api.constrains("name")
    def _check_name_not_blank(self):
        for stage in self:
            if not stage.name or not stage.name.strip():
                raise ValidationError(_("Tên trạng thái không được để trống."))
