/**
 * The guide's content and print styling.
 *
 * Kept apart from the mechanics so the wording can be edited without touching
 * Chrome, CDP or the screenshot pipeline.
 *
 * NOTE: this duplicates the wording in HANDOFF.md. They are deliberately two
 * files — the markdown is the repository's record, this is the printed
 * deliverable — but that means a change to one needs the same change to the
 * other. If they drift often enough to be a nuisance, generate this from the
 * markdown instead.
 */
export const buildManagerGuide = ({ img, font, icon }) => {
const shot = (file, caption) => `
  <figure class="shot">
    <img src="${img(file)}" alt="">
    <figcaption>${caption}</figcaption>
  </figure>`;

  const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Inter';
    src: url('${font}') format('woff2');
    font-weight: 100 900;
    font-display: block;
  }

  @page { size: A4; margin: 18mm 17mm 20mm; }

  :root {
    --ink: #1c2530;
    --muted: #5b6875;
    --line: #dde3ea;
    --brand: #006bbb;
    --warn-bg: #fdf6e7;
    --warn-line: #e6cf9a;
    --warn-ink: #7a5a12;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, system-ui, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: var(--ink);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  h1, h2, h3 { line-height: 1.2; letter-spacing: -0.015em; }
  h2 {
    font-size: 16pt; margin: 0 0 4mm;
    padding-bottom: 2.5mm; border-bottom: 1.5px solid var(--line);
  }
  h3 { font-size: 11.5pt; margin: 7mm 0 2mm; }
  p { margin: 0 0 3mm; }
  ul { margin: 0 0 3mm; padding-left: 5mm; }
  li { margin-bottom: 1.5mm; }
  strong { font-weight: 600; }
  code {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 9.5pt; background: #f1f4f8; padding: 0.4mm 1.2mm; border-radius: 1mm;
  }

  /* Each section starts a page: a printed guide is navigated by flipping. */
  section { break-before: page; }
  section.first { break-before: auto; }

  .cover {
    height: 250mm; display: flex; flex-direction: column; justify-content: center;
    break-after: page;
  }
  .cover .mark { width: 22mm; height: 22mm; margin-bottom: 9mm; }
  /* The inline SVG carries its own 512px width attribute, which wins over
     the container unless it is overridden explicitly. */
  .cover .mark svg { width: 100%; height: 100%; display: block; }
  .cover h1 { font-size: 34pt; margin: 0 0 3mm; }
  .cover .sub { font-size: 13pt; color: var(--muted); margin: 0 0 14mm; max-width: 120mm; }
  .cover .meta { font-size: 9.5pt; color: var(--muted); border-top: 1.5px solid var(--line); padding-top: 4mm; }

  .lead { font-size: 11.5pt; color: var(--muted); margin: -1mm 0 5mm; }

  .shot { margin: 4mm 0 5mm; break-inside: avoid; }
  .shot img {
    width: 100%; display: block; border-radius: 1.5mm;
    /* The app's own background is nearly white, so without an edge a screenshot
       bleeds into the page. Done here rather than baked into the image. */
    border: 0.7px solid #d6dce4;
    box-shadow: 0 1mm 3mm rgba(28,37,48,0.10);
  }
  .shot.narrow img { width: 74mm; margin: 0 auto; }
  .shot.pair { display: flex; gap: 5mm; align-items: flex-start; }
  /* A plain 50% plus a gap overflows the row and clips the right-hand shot. */
  .shot.pair img { width: calc(50% - 2.5mm); flex: 0 0 auto; }
  figcaption {
    font-size: 9pt; color: var(--muted); margin-top: 2.5mm; text-align: center;
  }

  .callout {
    background: var(--warn-bg); border: 1px solid var(--warn-line);
    border-radius: 2mm; padding: 4mm 5mm; margin: 4mm 0; break-inside: avoid;
  }
  .callout p:last-child { margin-bottom: 0; }
  .callout .label {
    font-size: 8.5pt; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--warn-ink); margin-bottom: 1.5mm;
  }

  .note {
    border-left: 3px solid var(--brand); padding: 1mm 0 1mm 4mm;
    margin: 4mm 0; color: var(--muted); break-inside: avoid;
  }
  .note p:last-child { margin-bottom: 0; }

  .msg {
    background: #f1f4f8; border-radius: 2mm; padding: 4mm 5mm; margin: 3mm 0;
    font-size: 10pt; break-inside: avoid;
  }
  .msg p { margin: 0 0 1.5mm; }
  .msg p:last-child { margin: 0; }

  .steps { counter-reset: step; list-style: none; padding: 0; }
  .steps li {
    counter-increment: step; position: relative; padding-left: 9mm; margin-bottom: 3mm;
  }
  .steps li::before {
    content: counter(step); position: absolute; left: 0; top: 0.2mm;
    width: 6mm; height: 6mm; border-radius: 50%;
    background: var(--brand); color: #fff;
    font-size: 8.5pt; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
  }
</style></head><body>

<div class="cover">
  <div class="mark">${icon}</div>
  <h1>TimeGate</h1>
  <p class="sub">Recording staff clock-in, clock-out and break times. A guide for the manager running it.</p>
  <div class="meta">
    Nothing in this guide needs any technical knowledge.<br>
    Prepared for review · September 2026
  </div>
</div>

<section class="first">
  <h2>What it does</h2>
  <p class="lead">Staff clock in and out with a 4-digit code, on the tablet at the entrance or on their own phone.</p>
  <p>A normal day is four taps: <strong>clock in</strong>, <strong>start break</strong>, <strong>end break</strong>, <strong>clock out</strong>. Breaks can be taken as often as needed — tea and lunch are both just breaks.</p>
  ${shot('s01-keypad.png', 'The screen staff see. They enter their own 4-digit code — nothing else.')}
</section>

<section>
  <h2>Two things to decide before you rely on it</h2>

  <h3>1. Staff can clock in from anywhere</h3>
  <p>There is no check that someone is at the workplace. Anybody who has the punch link and their own code can clock in from home, from the bus, from bed.</p>
  <p>The old tablet-on-the-wall arrangement stopped that by being a physical object in a physical place. This does not, and no amount of software will: a phone cannot prove where it is without tracking where your staff are, which is a much bigger decision than a timesheet.</p>
  <div class="callout">
    <div class="label">What you have instead</div>
    <p>Every punch has a name on it and appears on your Records screen the same day. If someone's hours look wrong, you can see exactly when they clocked in and ask about it. That is a management control, not a technical one — worth being clear with the team that you can see it.</p>
    <p>If this matters more than convenience, keep the punch link on the entrance tablet only and do not send it to anyone.</p>
  </div>

  <h3>2. Breaks are unpaid</h3>
  <p>Break time is subtracted from the hours you pay. A 09:00–17:00 day with a 15-minute break pays <strong>7&nbsp;h&nbsp;45&nbsp;m</strong>, not 8 hours.</p>
  <p>This was confirmed as how you pay, and it is built in. If it is ever wrong, say so <em>before</em> a payroll run rather than after — it changes every shift.</p>
</section>

<section>
  <h2>What a staff member sees</h2>
  <p>They enter their code, the screen greets them by name and offers only what makes sense next — someone already clocked in is not offered "clock in" again.</p>
  <div class="shot pair">
    <img src="${img('s02-clocked-out.png')}" alt="">
    <img src="${img('s03-confirmed.png')}" alt="">
  </div>
  <figcaption>Left: after entering a code. Right: the confirmation, which returns to the keypad by itself after a few seconds so the next person never sees a colleague's hours.</figcaption>
  <div class="note">
    <p>The confirmation shows their week so far, with breaks already deducted. Most questions about hours get answered here rather than reaching you.</p>
  </div>
</section>

<section>
  <h2>Adding someone</h2>
  <p>On <strong>Staff</strong> → <em>Add a staff member</em>. You will see their code <strong>once</strong>. It cannot be shown again, so send it before you close the panel. If it gets lost, issue a new one — the old one stops working immediately.</p>
  ${shot('m05-staff.png', 'The Staff screen. A newly issued code appears at the top, once.')}
  <p>Send them one message with both halves:</p>
  <div class="msg">
    <p>Hi [name] — clock in and out here: [punch link]</p>
    <p>Your code is [1234]. Keep it to yourself.</p>
    <p>Save the link to your home screen and it is one tap from then on.</p>
  </div>
  <p>Codes are private. Two people sharing one means two people's hours under one name.</p>

  <h3>When someone leaves</h3>
  <p><strong>Staff</strong> → <em>Mark as left</em>. Their code stops working straight away. Their existing hours are untouched: they still appear in that week's export, and they still get paid for what they worked.</p>
</section>

<section>
  <h2>Fixing a forgotten punch</h2>
  <p class="lead">People forget to clock out. It will happen in the first week.</p>
  <p>Those shifts appear on <strong>Records</strong> marked <strong>Needs review</strong>, with <strong>0:00</strong> payable and a banner above the table. The real times they did record are kept exactly as they are — nothing is guessed.</p>
  ${shot('m03-records.png', 'The Records screen. The flagged shift is the one that needs a decision from you.')}
  <p>Press <strong>Fix</strong>, enter the time that actually happened, and save. The totals update immediately.</p>
  ${shot('m04-correction.png', 'Correcting a shift. Times are read as London time.')}
  <div class="callout">
    <div class="label">Why zero and not an estimate</div>
    <p>The system will not invent a clock-out time, because an invented time is an invented wage. Zero and a warning is a number you will notice. A plausible guess is one you will not.</p>
    <p>A reviewed shift stays in the export either way, at zero hours with its status showing, so nobody is ever quietly paid short.</p>
  </div>
</section>

<section>
  <h2>Paying people</h2>
  <p><strong>Records</strong> → pick the week with the arrows → <strong>Export CSV</strong>.</p>
  <p>One row per shift, with the payroll reference so it can be matched to your payroll system. Hours appear twice — as a decimal (<code>7.75</code>) and as hours and minutes (<code>7:45</code>) — because different systems want different ones.</p>
  <div class="callout">
    <div class="label">Before you export</div>
    <p>Clear anything marked <strong>Needs review</strong>. The banner tells you how many. Exporting with them unresolved means those shifts pay zero.</p>
  </div>
  <p>Individual break times are on screen only, not in the export, so the file stays one row per shift and can be checked by hand.</p>
  ${shot('m02-today.png', 'The Today screen shows who is on shift, on a break, or not in.')}
</section>

<section>
  <h2>Installing it on a phone or tablet</h2>
  <p>TimeGate installs like an app, so it opens full-screen with no address bar.</p>
  <ul>
    <li><strong>Android / Chrome:</strong> open the punch link, then the menu → <em>Install app</em> (or <em>Add to Home screen</em>). Chrome may also offer it by itself.</li>
    <li><strong>iPhone / Safari:</strong> open the punch link, tap Share, then <em>Add to Home Screen</em>.</li>
  </ul>
  <p>It is the same app either way — installing only changes how it opens. Nothing comes from an app store and there is nothing to update by hand.</p>

  <h3>If the wifi drops</h3>
  <p>The screen still opens without a connection, but it will say <strong>"No connection — clocking in and out is paused"</strong> and the keypad will not accept anything.</p>
  <div class="note">
    <p>That is deliberate. It would be easy to let people tap away and save it up for later, and that is exactly how the wrong times get recorded. Nothing is stored, so nothing is stored wrong. Use pen and paper and enter it afterwards.</p>
  </div>

  <h3>The tablet at the entrance</h3>
  <ul>
    <li>Open the punch link and add it to the home screen.</li>
    <li>Turn on <strong>screen pinning</strong> (Android: Settings → Security → Screen pinning) so staff cannot wander into other apps.</li>
    <li>Set the screen timeout long, and keep it on charge.</li>
  </ul>
  <div class="callout">
    <div class="label">Treat the punch link like a door key</div>
    <p>It is deliberately long and unguessable, and that is what keeps the 4-digit codes from being guessed by anyone who finds the site. Fine to give to staff. Not to put on a noticeboard.</p>
  </div>
</section>

<section>
  <h2>If it stops working</h2>
  <p>Wifi down, tablet flat, site unreachable — fall back to <strong>pen and paper</strong>. Write down name, in, and out.</p>
  <p>When it is back, add those shifts yourself through <strong>Fix</strong> on the Records screen. The result is identical to if they had been tapped in at the time.</p>

  <h3>Clock changes</h3>
  <p>The system handles the two nights a year when the clocks move. A 22:00–06:00 night shift is <strong>7 hours</strong> in spring when the clocks go forward and <strong>9 hours</strong> in autumn when they go back, and is paid that way, because that is how long people were actually there.</p>
  <p>If you ever enter a time by hand that does not exist — 01:30 on the spring night — it will refuse it rather than move it quietly.</p>
</section>

<section>
  <h2>If you decide to keep it</h2>
  <p>This is currently running on a personal account on free hosting. That is fine for trying it out, and not where your payroll records should live long term.</p>
  <p>Before it becomes the real system of record:</p>
  <ol class="steps">
    <li>Move the hosting and the database to a company-owned account.</li>
    <li>Decide how long you keep punch records, and who is allowed to see them.</li>
    <li>Tell staff in writing what is recorded and why — clock-in, clock-out and break times are personal data.</li>
  </ol>
  <p>Ask whoever set it up to do the move. It is a short job, but it should happen before this is the only record of anyone's hours.</p>
</section>

</body></html>`;
  return html;
};
