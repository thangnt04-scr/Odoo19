from werkzeug.exceptions import NotFound

from odoo import http
from odoo.http import request


class HelpdeskController(http.Controller):
    @http.route(
        "/ho-tro/phieu/<int:ticket_id>/tom-tat",
        type="jsonrpc",
        auth="user",
        methods=["POST"],
    )
    def ticket_summary(self, ticket_id):
        ticket = request.env["helpdesk.ticket"].browse(ticket_id).exists()
        if not ticket:
            raise NotFound()
        ticket.check_access("read")
        return {
            "ma_phieu": ticket.ticket_ref,
            "tieu_de": ticket.name,
            "khach_hang": ticket.partner_id.display_name or False,
            "trang_thai": ticket.stage_id.name,
        }
