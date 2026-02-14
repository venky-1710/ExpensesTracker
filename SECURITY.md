# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

If you find a security vulnerability, please do NOT open an issue. Email [venkysss47@gmail.com] instead.

In your email, please provide:
- A description of the vulnerability.
- Steps to reproduce the issue.
- Potential impact.

We will acknowledge your report within 48 hours and provide an estimated timeline for a fix.

## Security Features

### Authentication

This application uses **JSON Web Tokens (JWT)** for stateless authentication.
- Tokens are signed using `HS256` algorithm.
- Access tokens have a short lifespan (1 hour by default).
- The backend sets an `access_token` cookie with `HttpOnly`, `Secure`, and `SameSite=Lax` attributes for enhanced security.
- The frontend also supports `Authorization: Bearer <token>` header authentication.

### Password Storage

User passwords are **never** stored in plain text.
- We use **Bcrypt** (via `passlib`) to hash passwords before storage.
- A work factor is used to ensure that brute-force attacks are computationally expensive.
- Password length is validated to prevent Denial of Service (DoS) attacks via long inputs (max 72 bytes).

### Data Protection

- **Database**: We use MongoDB to store application data.
- **Data Isolation**: User data is logically isolated; API endpoints enforce ownership checks to ensure users can only access their own data.
- **Input Validation**: All API inputs are validated using Pydantic models to prevent injection attacks and ensure data integrity.

### API Security

- **HTTPS**: In production, all communications are encrypted via HTTPS.
- **CORS**: Cross-Origin Resource Sharing (CORS) is configured to allow requests only from trusted origins (e.g., the frontend application).
- **Rate Limiting**: (Planned/Implemented) mechanisms to prevent abuse.

