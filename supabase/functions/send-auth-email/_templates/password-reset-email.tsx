import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const PasswordResetEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Sneaker Store password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset Your Password 🔒</Heading>
        <Text style={text}>
          We received a request to reset your Sneaker Store account password. No worries, it happens to the best of us!
        </Text>
        <Text style={text}>
          Click the link below to reset your password:
        </Text>
        <Link
          href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
          target="_blank"
          style={button}
        >
          Reset Your Password
        </Link>
        <Text style={text}>
          Or, copy and paste this reset code:
        </Text>
        <code style={code}>{token}</code>
        <Text style={warning}>
          This link will expire in 24 hours for security reasons.
        </Text>
        <Text style={footer}>
          You received this email because you requested a password reset for your account at sneakerstore.com. If you didn't request this reset, you can safely ignore this email - your password will remain unchanged.
        </Text>
        <Text style={signature}>
          Stay secure,<br />
          The Sneaker Store Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '16px 24px',
  margin: '24px 0',
  fontWeight: 'bold',
}

const code = {
  display: 'inline-block',
  padding: '16px 4.5%',
  width: '90.5%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
  fontSize: '14px',
  fontFamily: 'monospace',
  margin: '16px 0',
}

const warning = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '16px 0',
}

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '32px',
  marginBottom: '24px',
}

const signature = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  marginTop: '32px',
}