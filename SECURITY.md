# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Zembil, please report it responsibly:

### Public Disclosure
For non-critical vulnerabilities, please open a GitHub issue with the `security` label.

### Private Disclosure
For critical security vulnerabilities, please contact us privately:

- **Email**: [Your email here]
- **Subject**: "Security Vulnerability in Zembil"

### What to Include
When reporting a vulnerability, please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline
- We will acknowledge receipt within 48 hours
- We will provide a detailed response within 7 days
- We will keep you updated on our progress

### Security Best Practices

When using Zembil:

1. **Keep dependencies updated**: Regularly update your dependencies
2. **Use HTTPS**: Always use HTTPS for package downloads
3. **Verify checksums**: Zembil automatically verifies package checksums
4. **Secure cache**: Ensure your cache directory has appropriate permissions
5. **Network security**: Use secure networks when downloading packages

### Security Features

Zembil includes several security features:

- **Checksum verification**: All cached packages are verified using SHA256
- **Secure downloads**: Uses HTTPS for all package downloads
- **Isolated cache**: Packages are stored in isolated directories
- **Permission checks**: Validates file permissions before operations
- **Input validation**: All inputs are validated and sanitized

## Security Updates

Security updates will be released as:
- **Patch releases** (1.0.x) for critical security fixes
- **Minor releases** (1.x.0) for security improvements
- **Major releases** (x.0.0) for significant security changes

## Acknowledgments

We appreciate the security research community and will acknowledge security researchers who responsibly disclose vulnerabilities.
