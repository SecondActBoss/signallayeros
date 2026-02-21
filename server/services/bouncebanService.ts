export interface VerificationResult {
  email: string;
  result: string;
  safe: boolean;
}

export async function verifyEmail(email: string): Promise<VerificationResult> {
  const apiKey = process.env.BOUNCEBAN_API_KEY;
  if (!apiKey) {
    throw new Error("BOUNCEBAN_API_KEY is required");
  }

  try {
    const response = await fetch(
      `https://api-waterfall.bounceban.com/v1/verify/single?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 408) {
        return { email, result: "timeout", safe: false };
      }
      return { email, result: "error", safe: false };
    }

    const data = await response.json();

    const resultStatus = (data.result || data.status || "unknown").toLowerCase();
    const safe = resultStatus === "deliverable" || resultStatus === "safe" || resultStatus === "valid";

    return {
      email,
      result: resultStatus,
      safe,
    };
  } catch (err: any) {
    console.error(`BounceBan error for ${email}:`, err.message);
    return { email, result: "error", safe: false };
  }
}

export async function verifyEmails(
  emails: string[],
  onProgress?: (verified: number, total: number) => void
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (let i = 0; i < emails.length; i++) {
    const result = await verifyEmail(emails[i]);
    results.push(result);
    onProgress?.(i + 1, emails.length);

    if (i < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
