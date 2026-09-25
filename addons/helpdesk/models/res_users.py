from odoo import api, fields, models


class ResUsers(models.Model):
    _inherit = "res.users"

    helpdesk_agent = fields.Boolean(
        string="Nhân viên hỗ trợ",
        compute="_compute_helpdesk_agent",
        store=True,
    )

    @api.depends("group_ids.all_implied_ids")
    def _compute_helpdesk_agent(self):
        agent_group = self.env.ref("helpdesk.group_helpdesk_agent", raise_if_not_found=False)
        for user in self:
            user.helpdesk_agent = bool(agent_group and agent_group in user.all_group_ids)

