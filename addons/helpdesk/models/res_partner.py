from odoo import fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    helpdesk_customer = fields.Boolean(
        string="Khách hàng",
        help="Đánh dấu đây là khách hàng có thể tạo ticket hỗ trợ.",
    )
