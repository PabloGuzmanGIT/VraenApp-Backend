import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

/**
 * Email templates
 */
const emailTemplates = {
    passwordReset: {
        es: {
            subject: 'Recuperación de contraseña - Control de Compra',
            html: (name, resetLink) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Control de Compra</h1>
            </div>
            <div class="content">
              <h2>Hola ${name || 'Usuario'},</h2>
              <p>Recibimos una solicitud para restablecer tu contraseña.</p>
              <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
              <a href="${resetLink}" class="button">Restablecer Contraseña</a>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #666;">${resetLink}</p>
              <p><strong>Este enlace expirará en 1 hora.</strong></p>
              <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.</p>
            </div>
            <div class="footer">
              <p>© 2025 Control de Compra. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        },
        en: {
            subject: 'Password Recovery - Control de Compra',
            html: (name, resetLink) => `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Control de Compra</h1>
            </div>
            <div class="content">
              <h2>Hello ${name || 'User'},</h2>
              <p>We received a request to reset your password.</p>
              <p>Click the button below to create a new password:</p>
              <a href="${resetLink}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetLink}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, you can ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Control de Compra. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        },
    },
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, name, resetToken, language = 'es') => {
    const transporter = createTransporter();
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const template = emailTemplates.passwordReset[language] || emailTemplates.passwordReset.es;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: template.subject,
        html: template.html(name, resetLink),
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);
    } catch (error) {
        console.error('Failed to send email:', error);
        throw new Error('Failed to send email');
    }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (email, name, language = 'es') => {
    // TODO: Implement welcome email
    console.log(`Welcome email would be sent to ${email}`);
};
