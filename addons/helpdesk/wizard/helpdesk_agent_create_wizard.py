from odoo import Command, _, api, fields, models
from odoo.exceptions import UserError, ValidationError


class HelpdeskAgentCreateWizard(models.TransientModel):
    _name = "helpdesk.agent.create.wizard"
    _description = "Tạo nhân viên hỗ trợ"

    name = fields.Char(string="Tên nhân viên", required=True)
    login = fields.Char(string="Tên đăng nhập", required=True)
    email = fields.Char(string="Mail", required=True)
    password = fields.Char(string="Mật khẩu", required=True)

    @api.constrains("name", "login", "email", "password")
    def _check_required_values_not_blank(self):
        for wizard in self:
            if any(
                not value or not value.strip()
                for value in (wizard.name, wizard.login, wizard.email, wizard.password)
            ):
                raise ValidationError(_("Tên, tài khoản, Mail và mật khẩu không được để trống."))

    def action_create_agent(self):
        self.ensure_one()
        if not self.env.user.has_group("helpdesk.group_helpdesk_supervisor"):
            raise UserError(_("Chỉ Supervisor mới được tạo nhân viên hỗ trợ."))

        agent_group = self.env.ref("helpdesk.group_helpdesk_agent")
        self.env["res.users"].sudo().with_context(no_reset_password=True).create(
            {
                "name": self.name.strip(),
                "login": self.login.strip(),
                "email": self.email.strip(),
                "password": self.password.strip(),
                "group_ids": [Command.set([agent_group.id])],
            }
        )
        return {"type": "ir.actions.act_window_close"}
