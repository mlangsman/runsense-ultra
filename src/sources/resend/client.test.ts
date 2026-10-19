import { describe, expect, it, vi } from "vitest";
import { createResendSender, ResendError } from "./client";

const fetchWith = (status: number) =>
  vi.fn(async () => new Response(JSON.stringify({ id: "e1" }), { status }));

const message = {
  to: "runner@example.com",
  subject: "Morning run",
  text: "12.6 km",
  html: "<p>12.6 km</p>",
};

describe("Resend sender", () => {
  it("posts the message with the key and the sender", async () => {
    const fetch = fetchWith(200);
    await createResendSender({
      apiKey: "re_test",
      from: "Runsense <coach@example.com>",
      fetch,
    }).send(message);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer re_test",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Runsense <coach@example.com>",
      to: ["runner@example.com"],
      subject: "Morning run",
      text: "12.6 km",
      html: "<p>12.6 km</p>",
    });
  });

  it("throws a typed error with the status on failure", async () => {
    const sender = createResendSender({
      apiKey: "re_test",
      from: "a@b.c",
      fetch: fetchWith(422),
    });
    await expect(sender.send(message)).rejects.toBeInstanceOf(ResendError);
    await expect(sender.send(message)).rejects.toMatchObject({ status: 422 });
  });
});
