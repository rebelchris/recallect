export async function getServerSessionOrMock() {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === "1") {
    const email = process.env.MOCK_EMAIL || "mock@example.com";
    const name = process.env.MOCK_NAME || "Mock User";
    return { user: { email, name, image: null } };
  }
}

export function isMockAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_AUTH === "1";
}


