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

interface SignupEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const SignupEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: SignupEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Sneaker Store - Confirm your account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to Sneaker Store! 👟</Heading>
        <Text style={text}>
          Thank you for creating an account with Sneaker Store. We're excited to have you join our community of sneaker enthusiasts!
        </Text>
        <Text style={text}>
          Kindly click the link below for account confirmation:
        </Text>
        <Link
          href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
          target="_blank"
          style={button}
        >
          Confirm Your Account
        </Link>
        <Text style={text}>
          Or, copy and paste this confirmation code:
        </Text>
        <code style={code}>{token}</code>
        <Text style={footer}>
          You received this email because you signed up to sneakerstore.com. If you didn't create an account, you can safely ignore this email.
        </Text>
        <Text style={signature}>
          Welcome to the family,<br />
          The Sneaker Store Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
  backgroundColor: '#007ee6',
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