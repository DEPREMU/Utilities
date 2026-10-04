import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface AuthEmailProps {
  code: string;
  flowType: "login" | "signin";
  approximateLocation: string;
  expirationMinutes?: number;
  lang?: "en" | "es";
}

const styles = {
  main: {
    backgroundColor: "#f8fafc",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
    padding: "40px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "520px",
    padding: "36px 32px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  },
  badge: {
    backgroundColor: "#f5f3ff",
    color: "#7c3aed",
    borderRadius: "20px",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    padding: "4px 12px",
    textTransform: "uppercase" as const,
    marginBottom: "16px",
  },
  heading: {
    color: "#0f172a",
    fontSize: "24px",
    fontWeight: "700",
    lineHeight: "32px",
    margin: "0 0 12px",
  },
  subtext: {
    color: "#475569",
    fontSize: "15px",
    lineHeight: "22px",
    margin: "0 0 28px",
  },
  codeContainer: {
    backgroundColor: "#f5f3ff",
    border: "2px dashed #7c3aed",
    borderRadius: "10px",
    padding: "20px",
    textAlign: "center" as const,
    marginBottom: "24px",
  },
  codeLabel: {
    color: "#7c3aed",
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "1px",
    margin: "0 0 8px",
    textTransform: "uppercase" as const,
  },
  code: {
    color: "#7c3aed",
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: "34px",
    fontWeight: "800",
    letterSpacing: "6px",
    margin: "0",
  },
  expiryText: {
    color: "#64748b",
    fontSize: "13px",
    margin: "12px 0 0",
  },
  locationBox: {
    backgroundColor: "#f1f5f9",
    borderRadius: "8px",
    padding: "12px 16px",
    marginBottom: "24px",
  },
  locationLabel: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
    margin: "0 0 4px",
    textTransform: "uppercase" as const,
  },
  locationValue: {
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "600",
    margin: "0",
  },
  securityAlert: {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "8px",
    padding: "14px 16px",
    marginBottom: "24px",
  },
  securityTitle: {
    color: "#92400e",
    fontSize: "13px",
    fontWeight: "700",
    margin: "0 0 4px",
  },
  securityText: {
    color: "#b45309",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0",
  },
  hr: {
    borderColor: "#e2e8f0",
    margin: "24px 0",
  },
  footer: {
    color: "#94a3b8",
    fontSize: "12px",
    textAlign: "center" as const,
    margin: "0",
  },
};

/**
 * Renders the passwordless authentication email template.
 *
 * @param props - The email properties including code, flowType, and location
 * @returns The React Email JSX element
 */
export const AuthEmail = ({
  code = "A7K92PQM",
  flowType = "login",
  approximateLocation = "Location unavailable",
  expirationMinutes = 10,
  lang = "en",
}: AuthEmailProps): React.JSX.Element => {
  const isEs = lang === "es";
  const isLogin = flowType === "login";

  const previewText = isLogin
    ? isEs
      ? `Tu código de acceso a Utilities: ${code}`
      : `Your Utilities verification code: ${code}`
    : isEs
      ? `Tu código para registrarte en Utilities: ${code}`
      : `Your Utilities sign-in code: ${code}`;

  const utilitiesSecurity = "Utilities Security";

  const utilitiesFooter =
    "Utilities • Passwordless Authentication • Automated Security System";

  const title = isLogin
    ? isEs
      ? "Inicia sesión en Utilities"
      : "Log in to Utilities"
    : isEs
      ? "Bienvenido a Utilities"
      : "Welcome to Utilities";

  const description = isLogin
    ? isEs
      ? "Usa el siguiente código de verificación para iniciar sesión en tu cuenta."
      : "Use the verification code below to log into your account."
    : isEs
      ? "Usa el siguiente código de verificación para crear y acceder a tu cuenta."
      : "Use the verification code below to sign in and set up your account.";

  const codeLabelText = isEs ? "Código de verificación" : "Verification Code";

  const expiryNotice = isEs
    ? `Este código expira en ${expirationMinutes} minutos.`
    : `This code expires in ${expirationMinutes} minutes.`;

  const locationLabelText = isEs
    ? "Ubicación aproximada de la solicitud"
    : "Approximate Request Location";

  const securityHeading = isEs
    ? "Aviso de seguridad importante"
    : "Important Security Notice";

  const securityBody = isEs
    ? "Si no solicitaste este código, es posible que alguien esté intentando acceder a tu cuenta. No compartas este código con nadie. Tu cuenta permanece segura mientras no se comparta este código."
    : "If you did not request this code, someone may be attempting to access your account. Do not share this code with anyone. Your account remains secure as long as this code is not shared.";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section>
            <Text style={styles.badge}>{utilitiesSecurity}</Text>
            <Heading style={styles.heading}>{title}</Heading>
            <Text style={styles.subtext}>{description}</Text>
          </Section>

          <Section style={styles.codeContainer}>
            <Text style={styles.codeLabel}>{codeLabelText}</Text>
            <Text style={styles.code}>{code}</Text>
            <Text style={styles.expiryText}>{expiryNotice}</Text>
          </Section>

          <Section style={styles.locationBox}>
            <Text style={styles.locationLabel}>{locationLabelText}</Text>
            <Text style={styles.locationValue}>{approximateLocation}</Text>
          </Section>

          <Section style={styles.securityAlert}>
            <Text style={styles.securityTitle}>{securityHeading}</Text>
            <Text style={styles.securityText}>{securityBody}</Text>
          </Section>

          <Hr style={styles.hr} />

          <Section>
            <Text style={styles.footer}>{utilitiesFooter}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AuthEmail;
