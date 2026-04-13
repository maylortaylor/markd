# Security Policy

## Privacy Guarantee

Markd is designed to be 100% local. The application:

- Makes zero network calls of any kind
- Collects no telemetry, analytics, or usage data
- Stores no data outside your local machine
- Reads only the folders you explicitly select and the app config directory
- Has no accounts, cloud sync, or sign-in functionality

These guarantees are enforced at the framework level by Tauri's capability-based
permission system. The app's security configuration explicitly denies all network
access (HTTP, WebSocket, fetch) and restricts filesystem access to user-selected
directories and the app config path.

## Reporting a Vulnerability

If you discover a security vulnerability in Markd, please report it responsibly:

1. **Do not open a public GitHub issue** for security vulnerabilities
2. Open a [GitHub Security Advisory](https://github.com/maylortaylor/markd/security/advisories/new) (private, only visible to maintainers)
3. Include: description of the vulnerability, steps to reproduce, and potential impact
4. You will receive a response within 72 hours

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| Older   | No        |

## Scope

Security issues in the following areas are in scope:

- Filesystem access beyond the selected directory
- Network access that bypasses the Tauri capability deny
- Code execution vulnerabilities
- Data leakage to external systems

Issues that are NOT in scope:

- Physical access attacks (if someone has your machine, they have your files)
- Social engineering
- Third-party dependency vulnerabilities (report these upstream, but let us know)
