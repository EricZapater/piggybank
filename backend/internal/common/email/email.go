package email

import (
	"bytes"
	"fmt"
	"text/template"

	"github.com/wneessen/go-mail"
)

// Service handles email sending operations.
type Service struct {
	smtpHost string
	smtpPort string
	username string
	password string
	from     string
	baseURL  string
}

// NewService creates a new email service.
func NewService(smtpHost, smtpPort, username, password, from, baseURL string) Service {
	return Service{
		smtpHost: smtpHost,
		smtpPort: smtpPort,
		username: username,
		password: password,
		from:     from,
		baseURL:  baseURL,
	}
}

// SendInvitation sends a couple invitation email.
func (s Service) SendInvitation(toEmail, inviterName, invitationToken string) error {
	subject := "PiggyBank Couple Invitation"

	// Generate invitation URL that points to the frontend app
	invitationURL := fmt.Sprintf("%s/register?invitationToken=%s&email=%s",
		s.baseURL, invitationToken, toEmail)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PiggyBank Couple Invitation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2f80ed;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .button {
            display: inline-block;
            background-color: #10b981;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🐷 PiggyBank</h1>
        <h2>Couple Invitation</h2>
    </div>
    <div class="content">
        <p>Hello!</p>
        <p><strong>%s</strong> has invited you to join their PiggyBank couple!</p>
        <p>With PiggyBank, you can:</p>
        <ul>
            <li>Create shared savings goals</li>
            <li>Track progress together</li>
            <li>Celebrate achievements with vouchers</li>
        </ul>
        <p>Click the button below to accept the invitation and start your shared savings journey:</p>
        <a href="%s" class="button">Accept Invitation</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>%s</p>
    </div>
    <div class="footer">
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
</body>
</html>`, inviterName, invitationURL, invitationURL)

	m := mail.NewMsg()
	if err := m.From(s.from); err != nil {
		return fmt.Errorf("failed to set from address: %w", err)
	}

	if err := m.To(toEmail); err != nil {
		return fmt.Errorf("failed to set to address: %w", err)
	}

	m.Subject(subject)
	m.SetBodyString(mail.TypeTextHTML, htmlBody)

	c, err := mail.NewClient(s.smtpHost,
		mail.WithPort(s.getPort()),
		mail.WithSMTPAuth(mail.SMTPAuthLogin),
		mail.WithUsername(s.username),
		mail.WithPassword(s.password),
		mail.WithTLSPolicy(mail.TLSMandatory),
	)
	if err != nil {
		return fmt.Errorf("failed to create mail client: %w", err)
	}

	if err := c.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// getPort converts string port to int
func (s Service) getPort() int {
	switch s.smtpPort {
	case "587":
		return 587
	case "465":
		return 465
	case "25":
		return 25
	default:
		return 587 // default to STARTTLS
	}
}

// renderTemplate renders an HTML template with the given data.
func (s Service) renderTemplate(templateStr string, data interface{}) (string, error) {
	tmpl, err := template.New("email").Parse(templateStr)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

const invitationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PiggyBank Couple Invitation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2f80ed;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .button {
            display: inline-block;
            background-color: #10b981;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🐷 PiggyBank</h1>
        <h2>Couple Invitation</h2>
    </div>
    <div class="content">
        <p>Hello!</p>
        <p><strong>{{.InviterName}}</strong> has invited you to join their PiggyBank couple!</p>
        <p>With PiggyBank, you can:</p>
        <ul>
            <li>Create shared savings goals</li>
            <li>Track progress together</li>
            <li>Celebrate achievements with vouchers</li>
        </ul>
        <p>Click the button below to accept the invitation and start your shared savings journey:</p>
        <a href="{{.InvitationURL}}" class="button">Accept Invitation</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>{{.InvitationURL}}</p>
    </div>
    <div class="footer">
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
</body>
</html>
`
