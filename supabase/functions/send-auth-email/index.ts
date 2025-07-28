
import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupEmail } from './_templates/signup-email.tsx'
import { PasswordResetEmail } from './_templates/password-reset-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 400 })
  }

  try {
    const payload = await req.json()
    console.log('Received payload:', payload)
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = payload as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    let html: string
    let subject: string

    if (email_action_type === 'signup') {
      html = await renderAsync(
        React.createElement(SignupEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
          email_action_type,
        })
      )
      subject = 'Welcome to Sneaker Store - Confirm Your Account'
    } else if (email_action_type === 'recovery') {
      html = await renderAsync(
        React.createElement(PasswordResetEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
          email_action_type,
        })
      )
      subject = 'Reset Your Sneaker Store Password'
    } else {
      throw new Error('Unsupported email action type')
    }

    console.log('Sending email to:', user.email)
    
    const { error } = await resend.emails.send({
      from: 'Sneaker Store <onboarding@resend.dev>',
      to: [user.email],
      subject,
      html,
    })
    
    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully')
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
