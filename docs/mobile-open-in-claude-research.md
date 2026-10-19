# Getting a finished workout into Claude on the phone

Research note, 19 October 2026. Why the email's "Open in Claude" button lands on a web login on the iPhone, and every route we found to a lower-friction after-workout loop, including the new Claude surfaces (Cowork scheduled tasks, Claude Code routines, app intents). Nothing here is decided; the recommendation is at the end and the open item in DECISIONS.md points here.

## The short version

- **The cause is our own `/open` page.** claude.ai lists `/new` as a universal link for the Claude iPhone app, so a real tap on `https://claude.ai/new?q=…` should open the app. But `/open` sends phones on with a JavaScript redirect, and iOS never treats a script or server redirect as a universal link. The browser loads claude.ai, which is not signed in, so you get the login page.
- **Smallest fix:** on phones, `/open` should show a tappable button that is a plain link to claude.ai, not redirect. One extra tap, works from Mail, Messages and in-app browsers.
- **Bigger win:** let Claude start the conversation. Two new surfaces can do that today: a Cowork scheduled task (cloud, hourly, sends a phone notification, renders widgets) and a Claude Code routine fired by our webhook (instant, text only). Both need a phone test before choosing.
- **Still unknown until tested on the device:** whether the iPhone app reads `?q=` on `/new` and prefills the prompt. Anthropic documents it for desktop only.

## What is actually happening on the iPhone

1. The email button links to `/open?q=…` on our domain.
2. On a phone the page runs `location.replace("https://claude.ai/new?q=…")`.
3. iOS opens an app for a universal link only when the navigation traces back to a user tap on that link. Apple's engineers on the developer forums say redirects, JavaScript navigation and typed URLs all load the web page instead, and their technote TN3155 says not to use redirects at all. A tapped `<a href>` works.
4. claude.ai loads in Safari, or in the mail app's in-app browser, with no session, so it redirects to `/login`.

Supporting facts:

- `https://claude.ai/.well-known/apple-app-site-association` lists, for the Claude iOS app, the paths `/new`, `/code/*`, `/cowork/session_*`, `/scheduled-task/trig_*`, `/artifact/*`, `/share/*` and a few more. So `/new` is a universal link; `/login` is not, which is why no "open in app" banner appears once you are bounced to login.
- `https://claude.ai/.well-known/assetlinks.json` verifies the Android app for all of claude.ai. Which paths the Android app claims is in its manifest and untested.
- Anthropic's help article "Open the Claude mobile app with a link" documents only Claude Code routes on mobile (`claude://code/new?q=…` and `https://claude.ai/code/new?q=…`). The desktop article documents `claude://claude.ai/new?q=…` as prefill. Whether the mobile app honours `?q=` on `/new` is undocumented.
- In-app browsers (Gmail, probably Proton) load the first URL in a web view without handing off to the app, but a link tapped inside that page does hand off. Apple Mail and Messages hand off directly on the tap.
- Resend's click tracking is off by default. If it is ever switched on for our domain, every link is wrapped in a tracking redirect and universal links stop working. Leave it off.

## The options

Ranked by friction for the runner. "Taps" counts from the notification to Claude asking how it felt.

| #   | Route                                              | Taps | Instant? | Widgets? | Status                                   |
| --- | -------------------------------------------------- | ---- | -------- | -------- | ---------------------------------------- |
| A1  | `/open` shows a button on phones                   | 2    | yes      | yes      | small change, test on device             |
| A2  | Email button links straight to claude.ai           | 1    | yes      | yes      | fails in in-app browsers                 |
| B1  | SMS or iMessage instead of email                   | 1    | yes      | yes      | pennies per message, Twilio              |
| B2  | Pushover or ntfy notification with a URL action    | 1    | yes      | yes      | expected to work, untested               |
| C1  | Cowork scheduled task, hourly, with our connector  | 1    | hourly   | likely   | shipped October 2026, test               |
| C2  | Claude Code routine fired by our webhook           | 1    | yes      | no       | research preview, test                   |
| D1  | iOS Shortcut automation opens Claude on the email  | 0    | yes      | yes      | Apple Mail only, per-phone setup         |
| D2  | iOS Shortcut asks Claude via the "Ask Claude" intent | 0  | yes      | no       | no connectors, not saved to history      |

### A. Fix the link

**A1. Button, not redirect, on phones.** Keep the desktop handoff as it is. On a phone, render "Open in Claude" as a plain anchor to `https://claude.ai/new?q=…` and do nothing automatic. The tap inside Safari or an in-app browser is a user gesture, so iOS hands off to the app. Add the Smart App Banner meta tag (`apple-itunes-app`, app id `6473753684`) so Safari shows its own "Open" button too; it is ignored elsewhere and costs one line.

**A2. Link the email button straight to claude.ai.** One tap from Apple Mail or Messages. From Gmail's in-app browser it lands on the login page, unless Gmail is set to open links in Safari. We could offer both: the main button to claude.ai and a small "Open in the desktop app" link to `/open`. Decide after seeing which mail app the phone uses.

**A3. If the app opens but the prompt is empty.** Then `/new?q=` is a universal link but the app ignores `q`. Try `claude://claude.ai/new?q=…` from a tapped link on `/open`; the mobile app registers the `claude://` scheme and the desktop form of that link is documented to prefill. Safari shows an "Open in Claude?" confirmation for custom schemes, so it is a worse first choice than the universal link.

### B. Change the channel so the tap is native

**B1. SMS or iMessage.** A link tapped in Messages is Apple's own example of a universal link. Twilio sends a UK SMS for a few pence; iMessage needs a Mac or a relay, so SMS is the practical form. The summary fits in one message with the link. Bonus: iOS Shortcuts has a "Message received from" automation trigger, which makes D1 work without Apple Mail.

**B2. Pushover or ntfy.** Our webhook posts to their API; the phone shows a notification with an "Open URL" action; tapping it opens the URL through the system, which honours universal links. Pushover is a one-off purchase; ntfy is free and can be self-hosted. Neither is verified with the Claude app; a ten-minute test.

### C. Claude starts the conversation

The product brief says "Claude can't start a conversation". That is no longer quite true.

**C1. Cowork scheduled task in the cloud.** Since October 2026 scheduled tasks run on Anthropic's cloud, on Pro and Max, hourly at the fastest, with the account's connectors (ours included), and each run is its own session. The Claude mobile app supports scheduled tasks and "sends a phone notification when it finishes a task or needs your input". Interactive connectors (MCP Apps) render on Cowork and on iOS and Android. So an hourly task, "ask Runsense for workouts since your last run; if there is a new one, show it and ask how it felt", would push to the phone and open on the run with the widget. Costs: up to an hour late, one Claude run per hour whether or not there was a workout, and the task needs a way to know what is new (a `pending_checkins` tool on our side is the simplest). Unverified: that a custom connector's widget renders inside a task run, and that tapping the notification lands in the run on the phone.

**C2. Claude Code routine fired by our webhook.** Routines have an API trigger: `POST https://api.anthropic.com/v1/claude_code/routines/{trig_id}/fire` with a per-routine bearer token and a `text` body, limited to 30 fires an hour per routine. The routine runs in the cloud with the connectors you pick, so it can call `get_workout` and write the coach's question, and its notifications can be push to the phone or email. Tapping the push opens the session in the Claude app; `/code/*` is a universal link. So: webhook arrives, our route fires the routine with the workout id, a minute later the phone buzzes with Claude already asking. Costs: it is a Claude Code session, so no widgets and a coding-flavoured UI; the feature is a research preview; the mobile app cannot list past runs once the notification is gone (open issue #76841); the fire text arrives marked untrusted, so the routine's saved prompt must say "open the workout named in the routine-fire-payload". The token is one more Vercel secret. Routines are created with a repository attached, so this one would carry this repo and a prompt that touches nothing in it.

**C3. Dispatch.** Phone-to-desktop task relay with push on completion. Not open to new users and needs the Mac awake. Not for us.

### D. Automation on the phone

**D1. Shortcuts email automation.** iOS 17 and later: "when I get an email from runsense@…" can run immediately, but only for accounts in Apple Mail. The shortcut takes the links from the email body and runs "Open URL" on the claude.ai one, which opens the app directly. Zero taps, but it opens Claude the moment the email lands, which may be mid-cool-down, and it is a per-phone setup that only we would do. With B1, the "message received" trigger does the same for any mail app.

**D2. "Ask Claude" app intent.** The Claude app exposes an "Ask Claude" action to Shortcuts and Siri on iOS 18. It answers without opening the app and, per third-party reports, those chats are not saved to history and cannot use connectors. Fine for a one-line reply as a notification, not for the check-in loop.

## Ruled out, for the record

- **MCP itself.** No server-to-user channel. The 2026-07-28 spec went stateless, moved MCP Apps and Tasks into extensions and replaced server-initiated requests with a multi-round-trip pattern; nothing pushes to a phone.
- **Claude Code channels** (Telegram, Discord, iMessage). Events into a running local session; needs a machine on, and the reply goes to the chat app, not the coach.
- **Claude in Slack.** The Slack connector brings Slack into Claude, not the other way; the Slack app's DMs need a paid Slack workspace and custom connectors there are unverified.
- **Siri extensions for third-party models.** Reported for iOS 27, not shipped.
- **Web push from our own site as a home-screen app.** The notification opens our page, which can only JavaScript-navigate to claude.ai, so the same universal-link problem.
- **Managed Agents.** Hosting the coach elsewhere does not solve delivery to the phone.

## Recommendation

1. **Now, one small pull request:** A1 (button on phones, Smart App Banner), keep Resend tracking off, and test on the iPhone from Apple Mail and from Gmail. Record whether the app prefills the prompt from `/new?q=`; if it opens empty, test A3.
2. **Next, a half-day spike:** C2, the routine fired from the webhook, because it is instant and needs no polling. If widgets in the first reply matter more than the hour's delay, spike C1 instead. Pick after seeing both on the phone.
3. **Fallback:** B1 (SMS) if mail apps keep swallowing the link.

## Test checklist

- [ ] Tap the email button in Apple Mail on the iPhone: does the Claude app open, and is the prompt filled?
- [ ] Same from Gmail on the iPhone, with links set to open in the app's browser and then in Safari.
- [ ] Same from an SMS with the bare claude.ai link.
- [ ] `claude://claude.ai/new?q=…` tapped on the phone: app opens? prompt filled?
- [ ] A Cowork scheduled task with the Runsense connector: does the run render the widget, and does the phone notification open the run?
- [ ] A routine fired with `{"text": "workout i1001"}`: does the push arrive, and does the tap open the session?
- [ ] Android, if anyone has one: tap the email link and note what opens.

## Sources

- Apple app-site-association for claude.ai: https://claude.ai/.well-known/apple-app-site-association
- Android asset links for claude.ai: https://claude.ai/.well-known/assetlinks.json
- Open the Claude mobile app with a link: https://support.claude.com/en/articles/14898120-open-the-claude-mobile-app-with-a-link
- Open Claude Desktop with a link: https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link
- Apple forums, DTS on redirects and universal links: https://developer.apple.com/forums/thread/780496 and https://developer.apple.com/forums/thread/723275
- Apple TN3155, Debugging universal links: https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links
- Claude Code routines: https://code.claude.com/docs/en/routines
- Trigger a routine through the API: https://platform.claude.com/docs/en/api/claude-code/routines-fire
- Routines on mobile, no run history after the notification: https://github.com/anthropics/claude-code/issues/76841
- Claude Code on mobile and push notifications: https://code.claude.com/docs/en/mobile and https://code.claude.com/docs/en/remote-control
- Use Claude Cowork on web, desktop, and mobile: https://support.claude.com/en/articles/15520349-use-claude-cowork-on-web-desktop-and-mobile
- Schedule recurring tasks in Claude Cowork: https://support.claude.com/en/articles/13854387
- Use interactive connectors in Claude: https://support.claude.com/en/articles/13454812-use-interactive-connectors-in-claude
- Claude app intents, shortcuts and widgets on iOS: https://support.claude.com/en/articles/10263469-use-claude-app-intents-shortcuts-and-widgets-on-ios
- Dispatch: https://support.claude.com/en/articles/13947068-assign-tasks-from-anywhere-in-claude-cowork
- Claude Code channels: https://code.claude.com/docs/en/channels
- The 2026-07-28 MCP specification: https://blog.modelcontextprotocol.io/posts/2026-07-28/
- Shortcuts email trigger: https://support.apple.com/guide/shortcuts/apdd711f9dff/ios
- Resend open and click tracking: https://resend.com/docs/dashboard/domains/tracking
