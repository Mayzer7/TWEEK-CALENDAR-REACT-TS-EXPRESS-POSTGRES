import nodemailer from "nodemailer";

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function getMailerConfig(): MailerConfig {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM"
    );
  }

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from,
  };
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
  username?: string;
}) {
  const cfg = getMailerConfig();

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  const subject = "Восстановление пароля";
  const text = `Здравствуйте${params.username ? `, ${params.username}` : ""}!\n\nВы запросили восстановление пароля.\nОткройте ссылку, чтобы задать новый пароль:\n${params.resetUrl}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это письмо.\n`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Здравствуйте${params.username ? `, <b>${params.username}</b>` : ""}!</p>
      <p>Вы запросили восстановление пароля.</p>
      <p>
        <a href="${params.resetUrl}" target="_blank" rel="noreferrer">
          Нажмите здесь, чтобы задать новый пароль
        </a>
      </p>
      <p style="color:#666;font-size:12px;">
        Если вы не запрашивали восстановление, просто проигнорируйте это письмо.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject,
    text,
    html,
  });
}

